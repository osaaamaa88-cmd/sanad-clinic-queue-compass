import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { truncateClientKey } from "./limits";

/** Public: profile media (signed URLs), posts, followers count and real rating average. */
export const svrGetClinicProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("avatar_url, cover_url, bio, is_disabled")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (!clinic || clinic.is_disabled) {
      return {
        bio: "",
        avatarUrl: "",
        coverUrl: "",
        posts: [],
        postsCount: 0,
        followers: 0,
        ratingAvg: 0,
        reviewsCount: 0,
      };
    }

    const { data: posts } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, media_url, media_type, caption, created_at")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(60);

    const paths = [
      ...(clinic?.avatar_url ? [clinic.avatar_url] : []),
      ...(clinic?.cover_url ? [clinic.cover_url] : []),
      ...(posts ?? []).map((p) => p.media_url),
    ];
    const { signMediaRefs } = await import("@/lib/media-sign.server");
    const signedMap = await signMediaRefs(supabaseAdmin, paths);

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

/** Public: follow / unfollow a clinic with an anonymous device key. */
export const svrToggleFollow = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; followerKey: string; follow: boolean }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    const key = truncateClientKey(data.followerKey);
    if (!key) throw new Error("Invalid input");
    return { clinicId: data.clinicId, followerKey: key, follow: Boolean(data.follow) };
  })
  .handler(async ({ data }) => {
    data.followerKey = await (
      await import("@/lib/device-key.server")
    ).deviceIdentity(data.followerKey);
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
    return { clinicId: data.clinicId, followerKey: truncateClientKey(data.followerKey) };
  })
  .handler(async ({ data }) => {
    data.followerKey = await (
      await import("@/lib/device-key.server")
    ).deviceIdentity(data.followerKey);
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
  .inputValidator(
    (data: {
      clinicId: string;
      doctor?: string;
      specialtyId?: string;
      price?: number;
      phone?: string;
      bio?: string;
      workingHours?: string;
      youtubeUrl?: string;
    }) => {
      if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const patch: {
      doctor?: string;
      specialty_id?: string;
      price?: number;
      phone?: string;
      bio?: string;
      working_hours?: string;
      youtube_url?: string;
    } = {};
    if (typeof data.doctor === "string" && data.doctor.trim())
      patch.doctor = data.doctor.trim().slice(0, 120);
    if (typeof data.specialtyId === "string" && data.specialtyId)
      patch.specialty_id = data.specialtyId;
    if (typeof data.price === "number" && Number.isFinite(data.price))
      patch.price = Math.max(0, Math.floor(data.price));
    if (typeof data.phone === "string") patch.phone = data.phone.trim().slice(0, 40);
    if (typeof data.bio === "string") patch.bio = data.bio.slice(0, 600);
    if (typeof data.workingHours === "string")
      patch.working_hours = data.workingHours.slice(0, 300);
    if (typeof data.youtubeUrl === "string") {
      const { youtubeId } = await import("@/lib/youtube");
      const raw = data.youtubeUrl.trim();
      if (raw && !youtubeId(raw)) throw new Error("INVALID_YOUTUBE");
      patch.youtube_url = raw ? `https://www.youtube.com/watch?v=${youtubeId(raw)}` : "";
    }
    const { error } = await supabaseAdmin.from("clinics").update(patch).eq("id", data.clinicId);
    if (error) {
      console.error("[svrUpdateClinicProfile]", error.message);
      throw new Error("UPDATE_FAILED");
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
