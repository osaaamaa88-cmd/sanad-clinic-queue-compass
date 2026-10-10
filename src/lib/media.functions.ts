import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MEDIA_LIMITS = { avatar: 5 * 1024 * 1024, media: 50 * 1024 * 1024 } as const;
type Kind = "avatar" | "cover" | "post" | "story";

/** Clinic staff: get a one-time signed URL to upload directly to storage (supports big videos + progress). */
export const svrCreateUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clinicId: string; kind: Kind; fileName: string; contentType: string; size: number }) => {
    if (!d || typeof d.clinicId !== "string") throw new Error("Invalid input");
    if (!["avatar", "cover", "post", "story"].includes(d.kind)) throw new Error("Invalid kind");
    const ct = String(d.contentType ?? "");
    const isImage = ct.startsWith("image/");
    if (!isImage && !ct.startsWith("video/")) throw new Error("INVALID_TYPE");
    if ((d.kind === "avatar" || d.kind === "cover") && !isImage) throw new Error("INVALID_TYPE");
    const size = Number(d.size) || 0;
    const max = d.kind === "avatar" ? MEDIA_LIMITS.avatar : MEDIA_LIMITS.media;
    if (size <= 0 || size > max) throw new Error("FILE_TOO_LARGE");
    return {
      clinicId: d.clinicId,
      kind: d.kind,
      contentType: ct,
      fileName: String(d.fileName ?? "file").slice(-60).replace(/[^a-zA-Z0-9._-]/g, "_"),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const bucket = data.kind === "avatar" ? "avatars" : "clinic-media";
    const path = `${data.clinicId}/${data.kind}/${Date.now()}-${data.fileName}`;
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
  .inputValidator((d: {
    clinicId: string; kind: Kind; path: string; contentType: string;
    caption?: string; highlightId?: string | null; storyKind?: "story" | "urgent"; tag?: string; permanent?: boolean;
    durationHours?: number;
  }) => {
    if (!d || typeof d.clinicId !== "string" || typeof d.path !== "string") throw new Error("Invalid input");
    if (!d.path.startsWith(`${d.clinicId}/${d.kind}/`)) throw new Error("FORBIDDEN");
    return {
      clinicId: d.clinicId,
      kind: d.kind,
      path: d.path,
      isVideo: String(d.contentType ?? "").startsWith("video/"),
      caption: String(d.caption ?? "").slice(0, 300),
      highlightId: typeof d.highlightId === "string" && d.highlightId ? d.highlightId : null,
      storyKind: d.storyKind === "urgent" ? ("urgent" as const) : ("story" as const),
      tag: String(d.tag ?? "").slice(0, 30),
      permanent: Boolean(d.permanent),
      durationHours: d.durationHours === 12 ? 12 : 24,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { AVATAR_PREFIX } = await import("@/lib/media-sign.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const mediaType = data.isVideo ? "video" : "image";
    let error: { message: string } | null = null;
    if (data.kind === "avatar") {
      ({ error } = await supabaseAdmin.from("clinics").update({ avatar_url: AVATAR_PREFIX + data.path }).eq("id", data.clinicId));
    } else if (data.kind === "cover") {
      ({ error } = await supabaseAdmin.from("clinics").update({ cover_url: data.path }).eq("id", data.clinicId));
    } else if (data.kind === "post") {
      ({ error } = await supabaseAdmin.from("clinic_posts").insert({
        clinic_id: data.clinicId, media_url: data.path, media_type: mediaType, caption: data.caption,
      }));
    } else {
      ({ error } = await supabaseAdmin.from("clinic_stories").insert({
        clinic_id: data.clinicId, highlight_id: data.highlightId, media_url: data.path, media_type: mediaType,
        caption: data.caption, kind: data.storyKind, is_pinned: Boolean(data.highlightId), tag: data.tag,
        expires_at: new Date(Date.now() + (data.permanent || data.highlightId ? 3650 * 864e5 : data.durationHours * 36e5)).toISOString(),
      }));
    }
    if (error) {
      console.error("[svrFinalizeUpload]", error.message);
      throw new Error("UPLOAD_FAILED");
    }
    return { ok: true as const };
  });
