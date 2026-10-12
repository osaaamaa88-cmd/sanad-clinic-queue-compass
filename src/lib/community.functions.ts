import { createServerFn } from "@tanstack/react-start";

/** Public: clinics the viewer follows that currently have active stories (for the community stories bar). */
export const svrFollowedStories = createServerFn({ method: "POST" })
  .inputValidator((data: { followerKey: string }) => {
    if (!data || typeof data.followerKey !== "string" || data.followerKey.length < 32 || data.followerKey.length > 80) {
      return { followerKey: "" };
    }
    return { followerKey: data.followerKey };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    let clinicIds: string[] = [];
    if (data.followerKey) {
      const { data: f } = await supabaseAdmin.from("clinic_followers").select("clinic_id").eq("follower_key", data.followerKey).limit(200);
      clinicIds = (f ?? []).map((r) => r.clinic_id);
    }
    // Active stories first (followed clinics preferred), each with its newest story as a cover.
    let q = supabaseAdmin
      .from("clinic_stories")
      .select("clinic_id, media_url, created_at")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(300);
    if (clinicIds.length) q = q.in("clinic_id", clinicIds);
    const { data: stories } = await q;
    const covers = new Map<string, string>();
    const order: string[] = [];
    for (const s of stories ?? []) {
      if (!order.includes(s.clinic_id)) order.push(s.clinic_id);
      if (!covers.has(s.clinic_id) && s.media_url) covers.set(s.clinic_id, s.media_url);
    }
    let entries = order.slice(0, 30).map((id) => ({ id, hasStory: true, cover: covers.get(id) ?? "" }));
    if (!entries.length) {
      // Fall back to recent verified clinics + health tips so the bar is never empty.
      const { data: fc } = await supabaseAdmin
        .from("clinics")
        .select("id")
        .eq("is_verified", true)
        .eq("is_disabled", false)
        .order("created_at", { ascending: false })
        .limit(12);
      entries = (fc ?? []).map((c) => ({ id: c.id, hasStory: false, cover: "" }));
    }
    if (!entries.length) return { followed: clinicIds.length > 0, clinics: [] };
    const { data: clinics } = await supabaseAdmin
      .from("clinics")
      .select("id, doctor, avatar_url, phone")
      .in("id", entries.map((e) => e.id))
      .eq("is_verified", true)
      .eq("is_disabled", false);
    const { signMediaRefs } = await import("@/lib/media-sign.server");
    const signed = await signMediaRefs(supabaseAdmin, [
      ...(clinics ?? []).map((c) => c.avatar_url).filter(Boolean),
      ...entries.map((e) => e.cover).filter(Boolean),
    ]);
    const byId = new Map((clinics ?? []).map((c) => [c.id, c]));
    return {
      followed: clinicIds.length > 0,
      clinics: entries
        .map((e) => {
          const c = byId.get(e.id);
          if (!c) return null;
          return {
            id: c.id,
            doctor: c.doctor,
            phone: c.phone,
            avatar: c.avatar_url ? signed.get(c.avatar_url) ?? "" : "",
            hasStory: e.hasStory,
            cover: e.cover ? signed.get(e.cover) ?? "" : "",
          };
        })
        .filter((c): c is NonNullable<typeof c> => !!c),
    };
  });
