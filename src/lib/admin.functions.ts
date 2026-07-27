import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type GateSession = { unlocked?: boolean };

function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not set");
  return {
    password,
    name: "sandi-admin-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

async function assertAdmin() {
  const session = await useSession<GateSession>(getSessionConfig());
  if (session.data.unlocked !== true) {
    throw new Error("Unauthorized");
  }
}

export const adminListClinics = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
});

export const adminVerifyClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_verified: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clinics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [clinics, bookings] = await Promise.all([
    supabaseAdmin.from("clinics").select("id, is_verified"),
    supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }),
  ]);
  const rows = (clinics.data ?? []) as { is_verified: boolean }[];
  return {
    total: rows.length,
    verified: rows.filter((r) => r.is_verified).length,
    pending: rows.filter((r) => !r.is_verified).length,
    bookings: bookings.count ?? 0,
  };
});

export const adminToggleDisableClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; disabled: boolean }) => {
    if (!data || typeof data.id !== "string" || typeof data.disabled !== "boolean") {
      throw new Error("Invalid input");
    }
    return { id: data.id, disabled: data.disabled };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_disabled: data.disabled })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminEditClinic = createServerFn({ method: "POST" })
  .inputValidator((data: {
    id: string;
    doctor?: string;
    specialtyId?: string;
    address?: string;
    area?: string;
    phone?: string;
    price?: number;
  }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return data;
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      doctor?: string;
      specialty_id?: string;
      address?: string;
      area?: string;
      phone?: string;
      price?: number;
    } = {};
    if (typeof data.doctor === "string") patch.doctor = data.doctor;
    if (typeof data.specialtyId === "string") patch.specialty_id = data.specialtyId;
    if (typeof data.address === "string") patch.address = data.address;
    if (typeof data.area === "string") patch.area = data.area;
    if (typeof data.phone === "string") patch.phone = data.phone;
    if (typeof data.price === "number") patch.price = data.price;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabaseAdmin.from("clinics").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListBookings = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
});

export const adminAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [bookingsRes, clinicsRes] = await Promise.all([
    supabaseAdmin.from("bookings").select("clinic_id"),
    supabaseAdmin.from("clinics").select("id, doctor, specialty_id, is_verified, is_disabled"),
  ]);
  if (bookingsRes.error) throw new Error(bookingsRes.error.message);
  if (clinicsRes.error) throw new Error(clinicsRes.error.message);
  const clinics = (clinicsRes.data ?? []) as {
    id: string;
    doctor: string;
    specialty_id: string;
    is_verified: boolean;
    is_disabled: boolean;
  }[];
  const bookings = (bookingsRes.data ?? []) as { clinic_id: string }[];
  const clinicMap = new Map(clinics.map((c) => [c.id, c]));
  const perClinic = new Map<string, number>();
  const perSpecialty = new Map<string, number>();
  for (const b of bookings) {
    perClinic.set(b.clinic_id, (perClinic.get(b.clinic_id) ?? 0) + 1);
    const c = clinicMap.get(b.clinic_id);
    if (c) perSpecialty.set(c.specialty_id, (perSpecialty.get(c.specialty_id) ?? 0) + 1);
  }
  const topClinics = Array.from(perClinic.entries())
    .map(([id, count]) => ({
      id,
      count,
      doctor: clinicMap.get(id)?.doctor ?? "غير معروف",
      specialtyId: clinicMap.get(id)?.specialty_id ?? "",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const topSpecialties = Array.from(perSpecialty.entries())
    .map(([specialtyId, count]) => ({ specialtyId, count }))
    .sort((a, b) => b.count - a.count);
  return {
    totalBookings: bookings.length,
    totalClinics: clinics.length,
    pendingClinics: clinics.filter((c) => !c.is_verified).length,
    verifiedClinics: clinics.filter((c) => c.is_verified).length,
    disabledClinics: clinics.filter((c) => c.is_disabled).length,
    topClinics,
    topSpecialties,
  };
});