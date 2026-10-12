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
    // Fall back to featured/recent clinics so the bar is never empty for new users.
    let q = supabaseAdmin.from("clinic_stories").select("clinic_id, created_at").gt("expires_at", now).order("created_at", { ascending: false }).limit(300);
    if (clinicIds.length) q = q.in("clinic_id", clinicIds);
    const { data: stories } = await q;
    const order: string[] = [];
    for (const s of stories ?? []) if (!order.includes(s.clinic_id)) order.push(s.clinic_id);
    if (!order.length) return { followed: clinicIds.length > 0, clinics: [] };
    const { data: clinics } = await supabaseAdmin
      .from("clinics")
      .select("id, doctor, avatar_url, phone")
      .in("id", order.slice(0, 30))
      .eq("is_verified", true)
      .eq("is_disabled", false);
    const { signMediaRefs } = await import("@/lib/media-sign.server");
    const signed = await signMediaRefs(supabaseAdmin, (clinics ?? []).map((c) => c.avatar_url).filter(Boolean));
    const byId = new Map((clinics ?? []).map((c) => [c.id, c]));
    return {
      followed: clinicIds.length > 0,
      clinics: order
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => ({ id: c.id, doctor: c.doctor, phone: c.phone, avatar: c.avatar_url ? signed.get(c.avatar_url) ?? "" : "" })),
    };
  });
