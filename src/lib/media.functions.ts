import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  KYC_DOCUMENT_LIMIT,
  hasValidKycDocumentSignature,
  isKycDocumentType,
  isKycDocumentWithinLimit,
} from "@/lib/kyc-document";

export const MEDIA_LIMITS = { avatar: 5 * 1024 * 1024, media: 50 * 1024 * 1024 } as const;
type Kind = "avatar" | "cover" | "post" | "story" | "kyc";

async function assertClinicOwner(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  clinicId: string,
  userId: string,
) {
  const { data: clinic, error } = await admin
    .from("clinics")
    .select("owner_id")
    .eq("id", clinicId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!clinic || clinic.owner_id !== userId) throw new Error("FORBIDDEN");
}

/** Clinic staff: get a one-time signed URL to upload directly to storage (supports big videos + progress). */
export const svrCreateUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { clinicId: string; kind: Kind; fileName: string; contentType: string; size: number }) => {
      if (!d || typeof d.clinicId !== "string") throw new Error("Invalid input");
      if (!["avatar", "cover", "post", "story", "kyc"].includes(d.kind))
        throw new Error("Invalid kind");
      const ct = String(d.contentType ?? "");
      const isImage = ct.startsWith("image/");
      if (d.kind === "kyc") {
        if (!isKycDocumentType(ct)) throw new Error("INVALID_TYPE");
      } else {
        if (!isImage && !ct.startsWith("video/")) throw new Error("INVALID_TYPE");
        if ((d.kind === "avatar" || d.kind === "cover") && !isImage)
          throw new Error("INVALID_TYPE");
      }
      const size = Number(d.size) || 0;
      if (d.kind === "kyc" && !isKycDocumentWithinLimit(ct, size))
        throw new Error("FILE_TOO_LARGE");
      const max =
        d.kind === "avatar"
          ? MEDIA_LIMITS.avatar
          : d.kind === "kyc"
            ? KYC_DOCUMENT_LIMIT
            : MEDIA_LIMITS.media;
      if (size <= 0 || size > max) throw new Error("FILE_TOO_LARGE");
      return {
        clinicId: d.clinicId,
        kind: d.kind,
        contentType: ct,
        fileName: String(d.fileName ?? "file")
          .slice(-60)
          .replace(/[^a-zA-Z0-9._-]/g, "_"),
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "kyc") {
      await assertClinicOwner(supabaseAdmin, data.clinicId, context.userId);
    } else {
      const { assertClinicManager } = await import("@/lib/clinic-access.server");
      await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    }
    const bucket =
      data.kind === "avatar" ? "avatars" : data.kind === "kyc" ? "clinic-kyc" : "clinic-media";
    const kycExtension =
      data.contentType === "application/pdf"
        ? "pdf"
        : data.contentType === "image/jpeg"
          ? "jpg"
          : data.contentType === "image/png"
            ? "png"
            : "webp";
    const documentId = data.kind === "kyc" ? (await import("node:crypto")).randomUUID() : "";
    const path =
      data.kind === "kyc"
        ? `${data.clinicId}/kyc/${documentId}.${kycExtension}`
        : `${data.clinicId}/${data.kind}/${Date.now()}-${data.fileName}`;
    const { data: t, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !t) {
      console.error("[svrCreateUploadTicket]", error?.message);
      throw new Error("UPLOAD_FAILED");
    }
    return { signedUrl: t.signedUrl, path, bucket };
  });

/** Clinic staff: record an uploaded file as avatar / cover / post / story. */
export const svrFinalizeUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      clinicId: string;
      kind: Kind;
      path: string;
      contentType: string;
      caption?: string;
      highlightId?: string | null;
      storyKind?: "story" | "urgent";
      tag?: string;
      permanent?: boolean;
      durationHours?: number;
    }) => {
      if (!d || typeof d.clinicId !== "string" || typeof d.path !== "string")
        throw new Error("Invalid input");
      if (!["avatar", "cover", "post", "story", "kyc"].includes(d.kind))
        throw new Error("Invalid kind");
      if (!d.path.startsWith(`${d.clinicId}/${d.kind}/`)) throw new Error("FORBIDDEN");
      const contentType = String(d.contentType ?? "");
      if (d.kind === "kyc" && !isKycDocumentType(contentType)) throw new Error("INVALID_TYPE");
      if (
        d.kind === "kyc" &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/i.test(
          d.path.slice(`${d.clinicId}/kyc/`.length),
        )
      )
        throw new Error("FORBIDDEN");
      return {
        clinicId: d.clinicId,
        kind: d.kind,
        path: d.path,
        contentType,
        isVideo: contentType.startsWith("video/"),
        caption: String(d.caption ?? "").slice(0, 300),
        highlightId: typeof d.highlightId === "string" && d.highlightId ? d.highlightId : null,
        storyKind: d.storyKind === "urgent" ? ("urgent" as const) : ("story" as const),
        tag: String(d.tag ?? "").slice(0, 30),
        permanent: Boolean(d.permanent),
        durationHours: d.durationHours === 12 ? 12 : 24,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "kyc") {
      await assertClinicOwner(supabaseAdmin, data.clinicId, context.userId);
      const { data: file, error: downloadError } = await supabaseAdmin.storage
        .from("clinic-kyc")
        .download(data.path);
      if (downloadError || !file) {
        console.error("[svrFinalizeUpload] KYC document could not be read", downloadError?.message);
        throw new Error("UPLOAD_FAILED");
      }
      if (file.size > KYC_DOCUMENT_LIMIT) throw new Error("FILE_TOO_LARGE");
      const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (!hasValidKycDocumentSignature(data.contentType, signature))
        throw new Error("INVALID_TYPE");
      const { data: currentUser, error: currentUserError } =
        await supabaseAdmin.auth.admin.getUserById(context.userId);
      if (currentUserError) throw new Error(currentUserError.message);
      const previousPath = String(currentUser.user?.app_metadata?.license_doc_path ?? "");
      try {
        const { patchUserAppMetadata } = await import("@/lib/auth-admin.server");
        await patchUserAppMetadata(supabaseAdmin, context.userId, {
          license_doc_path: data.path,
        });
      } catch (error) {
        console.error(
          "[svrFinalizeUpload] KYC metadata update failed",
          error instanceof Error ? error.message : error,
        );
        throw new Error("UPLOAD_FAILED");
      }
      if (previousPath.startsWith(`${data.clinicId}/kyc/`) && previousPath !== data.path) {
        const { error: removeError } = await supabaseAdmin.storage
          .from("clinic-kyc")
          .remove([previousPath]);
        if (removeError)
          console.error(
            "[svrFinalizeUpload] Previous KYC document cleanup failed",
            removeError.message,
          );
      }
      return { ok: true as const };
    }

    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { AVATAR_PREFIX } = await import("@/lib/media-sign.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const mediaType = data.isVideo ? "video" : "image";
    let error: { message: string } | null = null;
    if (data.kind === "avatar") {
      ({ error } = await supabaseAdmin
        .from("clinics")
        .update({ avatar_url: AVATAR_PREFIX + data.path })
        .eq("id", data.clinicId));
    } else if (data.kind === "cover") {
      ({ error } = await supabaseAdmin
        .from("clinics")
        .update({ cover_url: data.path })
        .eq("id", data.clinicId));
    } else if (data.kind === "post") {
      ({ error } = await supabaseAdmin.from("clinic_posts").insert({
        clinic_id: data.clinicId,
        media_url: data.path,
        media_type: mediaType,
        caption: data.caption,
      }));
    } else {
      ({ error } = await supabaseAdmin.from("clinic_stories").insert({
        clinic_id: data.clinicId,
        highlight_id: data.highlightId,
        media_url: data.path,
        media_type: mediaType,
        caption: data.caption,
        kind: data.storyKind,
        is_pinned: Boolean(data.highlightId),
        tag: data.tag,
        expires_at: new Date(
          Date.now() +
            (data.permanent || data.highlightId ? 3650 * 864e5 : data.durationHours * 36e5),
        ).toISOString(),
      }));
    }
    if (error) {
      console.error("[svrFinalizeUpload]", error.message);
      throw new Error("UPLOAD_FAILED");
    }
    return { ok: true as const };
  });
