import { createServerFn } from "@tanstack/react-start";

/** Public: lightweight doctor directory for Instagram-style name search. */
export const svrDoctorDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: clinics } = await supabaseAdmin
    .from("clinics")
    .select("id, doctor, specialty_id, area, address, avatar_url, is_verified, is_featured")
    .eq("is_disabled", false)
    .limit(500);
  const rows = clinics ?? [];
  const { data: stories } = await supabaseAdmin
    .from("clinic_stories")
    .select("clinic_id")
    .is("highlight_id", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1000);
  const withStory = new Set((stories ?? []).map((s) => s.clinic_id));
  const { signMediaRefs } = await import("@/lib/media-sign.server");
  const map = await signMediaRefs(
    supabaseAdmin,
    rows.map((r) => r.avatar_url).filter(Boolean),
    60 * 60 * 24,
  );
  return rows.map((r) => ({
    id: r.id,
    doctor: r.doctor,
    specialtyId: r.specialty_id,
    area: r.area ?? "",
    address: r.address ?? "",
    avatarUrl: r.avatar_url ? (map.get(r.avatar_url) ?? "") : "",
    isVerified: Boolean(r.is_verified),
    isFeatured: Boolean(r.is_featured),
    hasStory: withStory.has(r.id),
  }));
});

export type DirectoryDoctor = Awaited<ReturnType<typeof svrDoctorDirectory>>[number];
