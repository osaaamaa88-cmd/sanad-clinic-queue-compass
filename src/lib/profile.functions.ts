import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: profile media (signed URLs), posts, followers count and real rating average. */
export const svrGetClinicProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const BUCKET = "clinic-media";

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("avatar_url, cover_url, bio")
      .eq("id", data.clinicId)
      .maybeSingle();

    const { data: posts } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, media_url, media_type, caption, created_at")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(60);

    const paths = [
      ...(clinic?.avatar_url ? [clinic.avatar_url] : []),
      ...(clinic?.cover_url ? [clinic.cover_url] : []),
      ...((posts ?? []).map((p) => p.media_url)),
    ];
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60 * 6);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedMap.set(s.path, s.signedUrl);
      }
    }

    const { count: followers } = await supabaseAdmin
      .from("clinic_followers")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", data.clinicId);

    const { data: reviews } = await supabaseAdmin
      .from("clinic_reviews")
      .select("rating")
      .eq("clinic_id", data.clinicId);
    const list = reviews ?? [];
    const ratingAvg = list.length
      ? Math.round((list.reduce((s, r) => s + Number(r.rating), 0) / list.length) * 10) / 10
      : 0;

    return {
      bio: clinic?.bio ?? "",
      avatarUrl: clinic?.avatar_url ? (signedMap.get(clinic.avatar_url) ?? "") : "",
      coverUrl: clinic?.cover_url ? (signedMap.get(clinic.cover_url) ?? "") : "",
      posts: (posts ?? []).map((p) => ({
        id: p.id,
        url: signedMap.get(p.media_url) ?? "",
        mediaType: p.media_type === "video" ? ("video" as const) : ("image" as const),
        caption: p.caption ?? "",
      })),
      postsCount: (posts ?? []).length,
      followers: followers ?? 0,
      ratingAvg,
      reviewsCount: list.length,
    };
  });

/** Public: live queue numbers for the profile card. */
export const svrClinicQueueStats = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("now_serving, clinic_status, delay_minutes, bookings_closed")
      .eq("id", data.clinicId)
      .maybeSingle();
    const { count: waiting } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", data.clinicId)
      .eq("status", "waiting");
    return {
      nowServing: clinic?.now_serving ?? 0,
      waiting: waiting ?? 0,
      clinicStatus: clinic?.clinic_status ?? "normal",
      delayMinutes: clinic?.delay_minutes ?? 0,
      bookingsClosed: Boolean(clinic?.bookings_closed),
    };
  });

/** Public: follow / unfollow a clinic with an anonymous device key. */
export const svrToggleFollow = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; followerKey: string; follow: boolean }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    const key = String(data.followerKey ?? "").slice(0, 80);
    if (!key) throw new Error("Invalid input");
    return { clinicId: data.clinicId, followerKey: key, follow: Boolean(data.follow) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.follow) {
      await supabaseAdmin
        .from("clinic_followers")
        .upsert(
          { clinic_id: data.clinicId, follower_key: data.followerKey },
          { onConflict: "clinic_id,follower_key" },
        );
    } else {
      await supabaseAdmin
        .from("clinic_followers")
        .delete()
        .eq("clinic_id", data.clinicId)
        .eq("follower_key", data.followerKey);
    }
    const { count } = await supabaseAdmin
      .from("clinic_followers")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", data.clinicId);
    return { following: data.follow, followers: count ?? 0 };
  });

/** Public: is this device already following? */
export const svrIsFollowing = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; followerKey: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId, followerKey: String(data.followerKey ?? "").slice(0, 80) };
  })
  .handler(async ({ data }) => {
    if (!data.followerKey) return { following: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("clinic_followers")
      .select("id")
      .eq("clinic_id", data.clinicId)
      .eq("follower_key", data.followerKey)
      .maybeSingle();
    return { following: Boolean(row) };
  });

/** Doctor/secretary: edit the profile fields shown on the clinic page. */
export const svrUpdateClinicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    clinicId: string;
    doctor?: string;
    specialtyId?: string;
    price?: number;
    phone?: string;
    bio?: string;
  }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const patch: Record<string, unknown> = {};
    if (typeof data.doctor === "string" && data.doctor.trim()) patch.doctor = data.doctor.trim().slice(0, 120);
    if (typeof data.specialtyId === "string" && data.specialtyId) patch.specialty_id = data.specialtyId;
    if (typeof data.price === "number" && Number.isFinite(data.price)) patch.price = Math.max(0, Math.floor(data.price));
    if (typeof data.phone === "string") patch.phone = data.phone.trim().slice(0, 40);
    if (typeof data.bio === "string") patch.bio = data.bio.slice(0, 600);
    const { error } = await supabaseAdmin.from("clinics").update(patch).eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Doctor/secretary: upload avatar, cover, or a gallery post (base64 payload). */
export const svrUploadClinicMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    clinicId: string;
    kind: "avatar" | "cover" | "post";
    fileName: string;
    contentType: string;
    base64: string;
    caption?: string;
  }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    if (!["avatar", "cover", "post"].includes(data.kind)) throw new Error("Invalid kind");
    const base64 = String(data.base64 ?? "");
    if (!base64) throw new Error("Invalid file");
    if (base64.length > 9_000_000) throw new Error("FILE_TOO_LARGE");
    const contentType = String(data.contentType ?? "");
    if (!/^(image|video)\//.test(contentType)) throw new Error("INVALID_TYPE");
    return {
      clinicId: data.clinicId,
      kind: data.kind as "avatar" | "cover" | "post",
      fileName: String(data.fileName ?? "file").slice(-60).replace(/[^a-zA-Z0-9._-]/g, "_"),
      contentType,
      base64,
      caption: String(data.caption ?? "").slice(0, 300),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);

    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const path = `${data.clinicId}/${data.kind}/${Date.now()}-${data.fileName}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("clinic-media")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    if (data.kind === "post") {
      const { error } = await supabaseAdmin.from("clinic_posts").insert({
        clinic_id: data.clinicId,
        media_url: path,
        media_type: data.contentType.startsWith("video/") ? "video" : "image",
        caption: data.caption,
      });
      if (error) throw new Error(error.message);
    } else {
      const column = data.kind === "avatar" ? "avatar_url" : "cover_url";
      const { error } = await supabaseAdmin
        .from("clinics")
        .update({ [column]: path })
        .eq("id", data.clinicId);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Doctor/secretary: remove one gallery post. */
export const svrDeleteClinicPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { postId: string }) => {
    if (!data || typeof data.postId !== "string") throw new Error("Invalid input");
    return { postId: data.postId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: post } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, clinic_id, media_url")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, post.clinic_id, context.userId);
    await supabaseAdmin.storage.from("clinic-media").remove([post.media_url]);
    await supabaseAdmin.from("clinic_posts").delete().eq("id", data.postId);
    return { ok: true as const };
  });
