import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const cleanName = (v: unknown) => {
  const n = String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
  if (n.length < 2 || n.length > 120) throw new Error("INVALID_NAME");
  return n;
};
const cleanPhone = (v: unknown, required = true) => {
  const p = String(v ?? "").replace(/[\s-]/g, "");
  if (!p && !required) return "";
  if (!/^\+?\d{8,15}$/.test(p)) throw new Error("INVALID_PHONE");
  return p;
};
const uuid = (v: unknown) => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("Invalid input");
  return v;
};

export const svrCreateBooking = createServerFn({ method: "POST" })
  .inputValidator((data: {
    clinicId: string;
    patientName: string;
    patientPhone: string;
    dayLabel: string;
    slot: string;
    visitType?: string;
  }) => {
    return {
      clinicId: uuid(data?.clinicId),
      patientName: cleanName(data.patientName),
      patientPhone: cleanPhone(data.patientPhone),
      dayLabel: String(data.dayLabel ?? "").slice(0, 80),
      slot: String(data.slot ?? "").slice(0, 40),
      visitType: data.visitType === "followup" ? "followup" : "new",
    };
  })
  .handler(async ({ data }) => {
    const { assertRateLimit, clientIp } = await import("@/lib/rate-limit.server");
    await assertRateLimit(`booking:ip:${await clientIp()}`, 10, 60);
    await assertRateLimit(`booking:phone:${data.patientPhone}`, 5, 3600);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ensure the clinic exists and is verified before allowing a booking.
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, is_verified, bookings_closed")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (!clinic || !clinic.is_verified) throw new Error("Clinic not available");
    if (clinic.bookings_closed) throw new Error("Bookings closed");

    const code = `SND-${(await import("@/lib/device-key.server")).randomCode(8)}`;
    const { data: rows, error } = await supabaseAdmin.rpc("create_booking", {
      p_clinic_id: data.clinicId, p_code: code, p_patient_name: data.patientName, p_patient_phone: data.patientPhone,
      p_day_label: data.dayLabel, p_slot: data.slot, p_visit_type: data.visitType,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (error || !row) {
      console.error("[svrCreateBooking]", error?.message ?? "no row returned");
      throw new Error("BOOKING_FAILED");
    }
    const { writeAudit } = await import("@/lib/audit.functions");
    await writeAudit("appointment_booked", null, `clinic:${data.clinicId} code:${row.code}`);
    // Return only what the patient needs — not the whole row of other patients.
    return {
      id: row.id,
      code: row.code,
      queueNumber: row.queue_number,
    };
  });

export const svrListBookingsForClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .order("queue_number", { ascending: true });
    if (error) {
      console.error("[svrListBookingsForClinic]", error.message);
      throw new Error("LOAD_FAILED");
    }
    return { rows: rows ?? [] };
  });

export const svrUpdateBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    if (!["waiting", "in", "done", "cancelled"].includes(data.status)) throw new Error("Invalid status");
    return { id: data.id, status: data.status };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, clinic_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!booking) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, booking.clinic_id, context.userId);
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) {
      console.error("[svrUpdateBookingStatus]", error.message);
      throw new Error("UPDATE_FAILED");
    }
    return { ok: true as const };
  });

export const svrAddWalkIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    clinicId: string;
    patientName: string;
    patientPhone: string;
    slot: string;
    visitType?: string;
  }) => {
    return {
      clinicId: uuid(data?.clinicId),
      patientName: cleanName(data.patientName),
      patientPhone: cleanPhone(data.patientPhone, false),
      slot: String(data.slot ?? "").slice(0, 40),
      visitType: data.visitType === "followup" ? "followup" : "new",
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { assertRateLimit, clientIp } = await import("@/lib/rate-limit.server");
    await assertRateLimit(`booking:ip:${await clientIp()}`, 10, 60);
    if (data.patientPhone) await assertRateLimit(`booking:phone:${data.patientPhone}`, 5, 3600);
    const code = `SND-${(await import("@/lib/device-key.server")).randomCode(8)}`;
    const { data: rows, error } = await supabaseAdmin.rpc("create_booking", {
      p_clinic_id: data.clinicId, p_code: code, p_patient_name: data.patientName, p_patient_phone: data.patientPhone,
      p_day_label: "اليوم", p_slot: data.slot, p_visit_type: data.visitType,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (error || !row) {
      console.error("[svrAddWalkIn]", error?.message ?? "no row returned");
      throw new Error("SAVE_FAILED");
    }
    return { id: row.id, code: row.code, queueNumber: row.queue_number };
  });

export const svrSetClinicOps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id: string;
    nowServing?: number;
    clinicStatus?: string;
    delayMinutes?: number;
    bookingsClosed?: boolean;
  }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    if (data.clinicStatus && !["normal", "delayed", "paused"].includes(data.clinicStatus)) {
      throw new Error("Invalid status");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.id, context.userId);
    const patch: {
      now_serving?: number;
      clinic_status?: string;
      delay_minutes?: number;
      bookings_closed?: boolean;
    } = {};
    if (typeof data.nowServing === "number") patch.now_serving = Math.max(0, Math.floor(data.nowServing));
    if (data.clinicStatus) patch.clinic_status = data.clinicStatus;
    if (typeof data.delayMinutes === "number") patch.delay_minutes = Math.max(0, Math.floor(data.delayMinutes));
    if (typeof data.bookingsClosed === "boolean") patch.bookings_closed = data.bookingsClosed;
    const { data: row, error } = await supabaseAdmin
      .from("clinics")
      .update(patch)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error || !row) {
      console.error("[svrSetClinicOps]", error?.message ?? "no row returned");
      throw new Error("UPDATE_FAILED");
    }
    return { row };
  });

export const svrUpdateClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      doctor: z.string().trim().min(2).max(120),
      specialtyId: z.string().trim().min(1).max(60),
      address: z.string().trim().max(300),
      area: z.string().trim().max(120),
      phone: z.string().trim().max(40),
      price: z.number().int().min(0).max(100000),
      availableNow: z.boolean(),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.id, context.userId);
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
    if (error || !row) {
      console.error("[svrUpdateClinic]", error?.message ?? "no row returned");
      throw new Error("UPDATE_FAILED");
    }
    return { row };
  });
/** Signed-in doctor creates their clinic. Ownership + trust fields are set server-side. */
export const svrCreateClinic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
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
    if (!data || typeof data.doctor !== "string" || !data.doctor.trim()) {
      throw new Error("Invalid input");
    }
    return {
      doctor: data.doctor.trim().slice(0, 120),
      specialtyId: String(data.specialtyId ?? "").slice(0, 60),
      address: String(data.address ?? "").slice(0, 300),
      area: String(data.area ?? "").slice(0, 120),
      phone: String(data.phone ?? "").slice(0, 40),
      price: Number.isFinite(data.price) ? Math.max(0, Math.floor(data.price)) : 0,
      availableNow: Boolean(data.availableNow),
      lat: Number.isFinite(data.lat) ? Number(data.lat) : 30.0444,
      lng: Number.isFinite(data.lng) ? Number(data.lng) : 31.2357,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("clinics").select("*").eq("owner_id", context.userId).maybeSingle();
    if (existing) return { row: existing };
    const { data: row, error } = await supabaseAdmin
      .from("clinics")
      .insert({
        doctor: data.doctor,
        specialty_id: data.specialtyId,
        address: data.address,
        area: data.area,
        phone: data.phone,
        price: data.price,
        available_now: data.availableNow,
        lat: data.lat,
        lng: data.lng,
        // Trust + ownership fields are never client-controlled.
        rating: 0,
        reviews: 0,
        is_verified: false,
        owner_id: context.userId,
      })
      .select()
      .maybeSingle();
    if (error || !row) {
      console.error("[svrCreateClinic]", error?.message ?? "no row returned");
      throw new Error("CREATE_FAILED");
    }
    return { row };
  });
