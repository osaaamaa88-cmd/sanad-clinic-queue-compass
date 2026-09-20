import { createServerFn } from "@tanstack/react-start";

/** Public: latest reviews for a clinic, with the "visited patient" badge flag. */
export const svrListClinicReviews = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("clinic_reviews")
      .select("id, rating, comment, patient_name, visited, created_at")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment ?? "",
        patientName: r.patient_name || "مريض",
        visited: Boolean(r.visited),
        createdAt: r.created_at,
      })),
    };
  });

/**
 * Public: a patient may only review after their booking is marked "done"
 * by the clinic. The booking code is the proof of visit.
 */
export const svrSubmitVerifiedReview = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; bookingCode: string; rating: number; comment?: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    const code = String(data.bookingCode ?? "").trim().toUpperCase().slice(0, 30);
    if (!code) throw new Error("NO_CODE");
    const rating = Math.round(Number(data.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("INVALID_RATING");
    return { clinicId: data.clinicId, bookingCode: code, rating, comment: String(data.comment ?? "").slice(0, 400) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, clinic_id, status, patient_name")
      .eq("code", data.bookingCode)
      .maybeSingle();

    if (!booking || booking.clinic_id !== data.clinicId) throw new Error("CODE_NOT_FOUND");
    if (booking.status !== "done") throw new Error("VISIT_NOT_DONE");

    const { data: existing } = await supabaseAdmin
      .from("clinic_reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (existing) throw new Error("ALREADY_REVIEWED");

    const { error } = await supabaseAdmin.from("clinic_reviews").insert({
      clinic_id: data.clinicId,
      booking_id: booking.id,
      rating: data.rating,
      comment: data.comment,
      patient_name: booking.patient_name || "مريض",
      visited: true,
    });
    if (error) {
      console.error("[svrSubmitVerifiedReview]", error.message);
      throw new Error("SAVE_FAILED");
    }

    // Keep the clinic card aggregates in sync with the real reviews.
    const { data: all } = await supabaseAdmin
      .from("clinic_reviews")
      .select("rating")
      .eq("clinic_id", data.clinicId);
    const list = all ?? [];
    const avg = list.length
      ? Math.round((list.reduce((s, r) => s + Number(r.rating), 0) / list.length) * 10) / 10
      : 0;
    await supabaseAdmin
      .from("clinics")
      .update({ rating: avg, reviews: list.length })
      .eq("id", data.clinicId);

    return { ok: true as const, ratingAvg: avg, reviewsCount: list.length };
  });
