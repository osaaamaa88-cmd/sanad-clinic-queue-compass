import { createServerFn } from "@tanstack/react-start";

async function assertAdmin() {
  const { assertAdminRequest } = await import("./admin-auth.server");
  await assertAdminRequest();
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

export const adminSetVerified = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; verified: boolean }) => {
    if (!data || typeof data.id !== "string" || typeof data.verified !== "boolean") {
      throw new Error("Invalid input");
    }
    return { id: data.id, verified: data.verified };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_verified: data.verified })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---- Doctor KYC (Verification & Licensing) ----

export type DoctorKycRow = {
  clinicId: string;
  doctor: string;
  specialtyId: string;
  area: string;
  phone: string;
  submittedAt: string;
  isVerified: boolean;
  verificationStatus: "pending_verification" | "verified" | "rejected" | "action_required";
  medicalLicense: string;
  syndicateNo: string;
  licenseDocPath: string;
  licenseDocUrl: string;
  email: string;
};

/**
 * Admin-only: list every clinic with the KYC data the doctor submitted at signup
 * (license + syndicate numbers live in server-managed auth app_metadata).
 */
export const adminListDoctorKyc = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: clinics, error } = await supabaseAdmin
    .from("clinics")
    .select("id,doctor,specialty_id,area,phone,submitted_at,is_verified,owner_id")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  // Fetch server-managed KYC metadata for owners (user-editable metadata is not authoritative).
  const ownerIds = [
    ...new Set(
      (clinics ?? [])
        .map((c) => (c as { owner_id?: string | null }).owner_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const meta = new Map<
    string,
    {
      medicalLicense: string;
      syndicateNo: string;
      status: string;
      licenseDocPath: string;
      email: string;
    }
  >();
  for (const uid of ownerIds) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(uid);
    if (userError) throw new Error(userError.message);
    const appMeta = (userData.user?.app_metadata ?? {}) as Record<string, unknown>;
    const legacyMeta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
    meta.set(uid, {
      medicalLicense: String(appMeta.medical_license ?? legacyMeta.medical_license ?? ""),
      syndicateNo: String(appMeta.syndicate_no ?? legacyMeta.syndicate_no ?? ""),
      licenseDocPath: String(appMeta.license_doc_path ?? ""),
      email: String(userData.user?.email ?? ""),
      status: String(appMeta.verification_status ?? ""),
    });
  }
  const rows: DoctorKycRow[] = (clinics ?? []).map((c) => {
    const r = c as unknown as {
      id: string;
      doctor: string;
      specialty_id: string;
      area: string;
      phone: string;
      submitted_at: string;
      is_verified: boolean;
      owner_id: string | null;
    };
    const k = meta.get(r.owner_id ?? "");
    const storedStatus = String(k?.status ?? "") as DoctorKycRow["verificationStatus"];
    const status = r.is_verified
      ? "verified"
      : storedStatus === "rejected" || storedStatus === "action_required"
        ? storedStatus
        : "pending_verification";
    const licenseDocPath =
      k?.licenseDocPath.startsWith(`${r.id}/kyc/`) === true ? k.licenseDocPath : "";
    return {
      clinicId: r.id,
      doctor: r.doctor,
      specialtyId: r.specialty_id,
      area: r.area,
      phone: r.phone,
      submittedAt: r.submitted_at,
      isVerified: r.is_verified,
      verificationStatus: status,
      medicalLicense: k?.medicalLicense ?? "",
      syndicateNo: k?.syndicateNo ?? "",
      licenseDocPath,
      licenseDocUrl: "",
      email: k?.email ?? "",
    };
  });
  const documentPaths = [...new Set(rows.map((row) => row.licenseDocPath).filter(Boolean))];
  const documentUrls = new Map<string, string>();
  if (documentPaths.length) {
    const { data: signedDocuments, error: signError } = await supabaseAdmin.storage
      .from("clinic-kyc")
      .createSignedUrls(documentPaths, 60 * 60);
    if (signError) throw new Error(signError.message);
    for (const document of signedDocuments ?? []) {
      if (document.path && document.signedUrl) documentUrls.set(document.path, document.signedUrl);
    }
  }
  return {
    rows: rows.map((row) => ({
      ...row,
      licenseDocUrl: documentUrls.get(row.licenseDocPath) ?? "",
    })),
  };
});

/**
 * Admin-only: approve a doctor — grants is_verified (golden badge) + sets
 * verification_status to "verified", and notifies the clinic.
 */
export const adminApproveDoctorKyc = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("owner_id")
      .eq("id", data.clinicId)
      .maybeSingle();
    const ownerId = (clinic as { owner_id?: string | null } | null)?.owner_id;
    if (!ownerId) throw new Error("CLINIC_NOT_FOUND");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_verified: true })
      .eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    const { patchUserAppMetadata } = await import("@/lib/auth-admin.server");
    await patchUserAppMetadata(supabaseAdmin, ownerId, { verification_status: "verified" });
    const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
      audience: "clinic",
      clinic_id: data.clinicId,
      title: "تم توثيق عيادتك ✅",
      body: "تهانينا! تم التحقق من ترخيصك بنجاح وتفعيل الشارة الرسمية لعيادتك.",
      url: "/doctor-settings",
      kind: "kyc",
    });
    if (notificationError) throw new Error(notificationError.message);
    return { ok: true as const };
  });

/**
 * Admin-only: reject / request extra review with a short reason. Sets
 * verification_status to "rejected" or "action_required" and notifies the clinic.
 */
export const adminRejectDoctorKyc = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; reason: string; actionRequired: boolean }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    const reason = String(data.reason ?? "")
      .trim()
      .slice(0, 300);
    if (!reason) throw new Error("INVALID_REASON");
    return { clinicId: data.clinicId, reason, actionRequired: Boolean(data.actionRequired) };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status = data.actionRequired ? "action_required" : "rejected";
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("owner_id")
      .eq("id", data.clinicId)
      .maybeSingle();
    const ownerId = (clinic as { owner_id?: string | null } | null)?.owner_id;
    if (!ownerId) throw new Error("CLINIC_NOT_FOUND");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_verified: false })
      .eq("id", data.clinicId);
    if (error) throw new Error(error.message);
    const { patchUserAppMetadata } = await import("@/lib/auth-admin.server");
    await patchUserAppMetadata(supabaseAdmin, ownerId, { verification_status: status });
    const { error: notificationError } = await supabaseAdmin.from("notifications").insert({
      audience: "clinic",
      clinic_id: data.clinicId,
      title: data.actionRequired ? "مطلوب تدقيق إضافي في بيانات التوثيق" : "لم يتم اعتماد التوثيق",
      body: `سبب التدقيق: ${data.reason}. من فضلك راجع بيانات ترخيص مزاولة المهنة ورقم القيد النقابي ثم أعد التقديم.`,
      url: "/doctor-settings",
      kind: "kyc",
    });
    if (notificationError) throw new Error(notificationError.message);
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
  .inputValidator(
    (data: {
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
    },
  )
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
export const adminUpdateHospitalLocation = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; lat: number; lng: number; verified: boolean }) => {
    if (!d || typeof d.id !== "string") throw new Error("Invalid input");
    const lat = Number(d.lat),
      lng = Number(d.lng);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < 21 ||
      lat > 32.5 ||
      lng < 24 ||
      lng > 37.5
    )
      throw new Error("الإحداثيات خارج حدود مصر");
    return { id: d.id, lat, lng, verified: !!d.verified };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("governmental_hospitals")
      .update({
        lat: data.lat,
        lng: data.lng,
        location_verified: data.verified,
        location_updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
