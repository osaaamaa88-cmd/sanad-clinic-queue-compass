import { createServerFn } from "@tanstack/react-start";

export const svrCreateBooking = createServerFn({ method: "POST" })
  .inputValidator((data: {
    clinicId: string;
    patientName: string;
    patientPhone: string;
    dayLabel: string;
    slot: string;
    visitType?: string;
  }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return {
      clinicId: data.clinicId,
      patientName: String(data.patientName ?? "").slice(0, 120),
      patientPhone: String(data.patientPhone ?? "").slice(0, 40),
      dayLabel: String(data.dayLabel ?? "").slice(0, 80),
      slot: String(data.slot ?? "").slice(0, 40),
      visitType: data.visitType === "followup" ? "followup" : "new",
    };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure the clinic exists and is verified before allowing a booking.
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, is_verified, bookings_closed")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (!clinic || !clinic.is_verified) throw new Error("Clinic not available");
    if (clinic.bookings_closed) throw new Error("Bookings closed");

    const code = `SND-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const { count } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", data.clinicId);
    const queueNumber = (count ?? 0) + 1;

    const { data: row, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        code,
        clinic_id: data.clinicId,
        patient_name: data.patientName,
        patient_phone: data.patientPhone,
        day_label: data.dayLabel,
        slot: data.slot,
        queue_number: queueNumber,
        visit_type: data.visitType,
        status: "waiting",
      })
      .select()
      .maybeSingle();
    if (error || !row) throw new Error(error?.message || "Failed to create booking");
    // Return only what the patient needs — not the whole row of other patients.
    return {
      id: row.id,
      code: row.code,
      queueNumber: row.queue_number,
    };
  });

export const svrListBookingsForClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .order("queue_number", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const svrUpdateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    if (!["waiting", "in", "done", "cancelled"].includes(data.status)) throw new Error("Invalid status");
    return { id: data.id, status: data.status };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const svrUpdateClinic = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    doctor: string;
    specialtyId: string;
    address: string;
    area: string;
    phone: string;
    price: number;
    availableNow: boolean;
    lat: number;
    lng: number;
  }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Do NOT allow flipping is_verified from this endpoint.
    const { data: row, error } = await supabaseAdmin
      .from("clinics")
      .update({
        doctor: data.doctor,
        specialty_id: data.specialtyId,
        address: data.address,
        area: data.area,
        phone: data.phone,
        price: data.price,
        available_now: data.availableNow,
        lat: data.lat,
        lng: data.lng,
      })
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error || !row) throw new Error(error?.message || "Failed to update clinic");
    return { row };
  });