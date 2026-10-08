import { supabase } from "@/integrations/supabase/client";
import {
  svrCreateBooking,
  svrListBookingsForClinic,
  svrUpdateBookingStatus,
  svrUpdateClinic,
  svrCreateClinic,
  svrSetClinicOps,
  svrAddWalkIn,
} from "@/lib/data.functions";
import { svrMyClinic, svrRegisterDoctor } from "@/lib/staff.functions";

export type Specialty = {
  id: string;
  name: string;
  emoji: string;
  category: "popular" | "surgical" | "family" | "therapy";
};

export const specialties: Specialty[] = [
  { id: "dental", name: "أسنان", emoji: "🦷", category: "popular" },
  { id: "internal", name: "باطنة", emoji: "🩺", category: "popular" },
  { id: "pediatrics", name: "أطفال", emoji: "👶", category: "family" },
  { id: "ortho", name: "عظام", emoji: "🦴", category: "therapy" },
  { id: "derma", name: "جلدية", emoji: "🧴", category: "popular" },
  { id: "cardio", name: "قلب وأوعية دموية", emoji: "❤️", category: "popular" },
  { id: "eye", name: "عيون", emoji: "👁️", category: "popular" },
  { id: "ent", name: "أنف وأذن وحنجرة", emoji: "👂", category: "popular" },
  { id: "gyneco", name: "نساء وتوليد", emoji: "🤰", category: "family" },
  { id: "neuro", name: "مخ وأعصاب", emoji: "🧠", category: "popular" },
  { id: "general-surgery", name: "جراحة عامة", emoji: "🩺", category: "surgical" },
  { id: "urology", name: "مسالك بولية", emoji: "🧬", category: "surgical" },
  { id: "physiotherapy", name: "علاج طبيعي", emoji: "🏃", category: "therapy" },
  { id: "oncology", name: "أورام", emoji: "🎗️", category: "popular" },
  { id: "endocrinology", name: "غدد صماء وسكر", emoji: "🩸", category: "popular" },
  { id: "gastro", name: "جهاز هضمي وكبد", emoji: "🫁", category: "popular" },
  { id: "chest", name: "صدرية", emoji: "🫁", category: "popular" },
  { id: "andrology", name: "أمراض ذكورة", emoji: "🧬", category: "surgical" },
  { id: "plastic-surgery", name: "جراحة تجميل", emoji: "✨", category: "surgical" },
  { id: "psychiatry", name: "نفسي وعصبي", emoji: "🧠", category: "therapy" },
  { id: "rheumatology", name: "روماتيزم", emoji: "🦴", category: "therapy" },
  { id: "neonatology", name: "طب أطفال حديثي الولادة", emoji: "🍼", category: "family" },
  { id: "speech-audiology", name: "تخاطب وسمعيات", emoji: "🗣️", category: "family" },
  { id: "nutrition", name: "تخسيس وتغذية", emoji: "🥗", category: "therapy" },
  { id: "family-medicine", name: "طب الأسرة", emoji: "👨‍👩‍👧", category: "family" },
];

export type Clinic = {
  id: string;
  doctor: string;
  specialtyId: string;
  address: string;
  area: string;
  distanceKm: number;
  price: number;
  rating: number;
  reviews: number;
  availableNow: boolean;
  phone: string;
  nowServing: number;
  yourNumber: number;
  waitingCount: number;
  lat: number;
  lng: number;
  isVerified: boolean;
  submittedAt: number;
  updatedAt: number;
  clinicStatus: ClinicStatus;
  delayMinutes: number;
  bookingsClosed: boolean;
  workingHours?: string;
  youtubeUrl?: string;
  /** "hospital" = governmental facility (no private doctor profile). */
  kind?: "clinic" | "hospital";
  /** Hospital location is approximate (not yet confirmed by the owner). */
  approxLocation?: boolean;
  hospitalType?: string;
};

export type ClinicStatus = "normal" | "delayed" | "paused";

export const clinicStatusLabels: Record<ClinicStatus, { label: string; dot: string }> = {
  normal: { label: "تعمل كالمعتاد", dot: "🟢" },
  delayed: { label: "تأخير في المواعيد", dot: "🟡" },
  paused: { label: "متوقفة مؤقتاً", dot: "🔴" },
};

function isBrowser() {
  return typeof window !== "undefined";
}

type Row = {
  id: string;
  doctor: string;
  specialty_id: string;
  address: string;
  area: string;
  phone: string;
  price: number;
  rating: number | string;
  reviews: number;
  available_now: boolean;
  distance_km: number | string;
  now_serving: number;
  your_number: number;
  waiting_count: number;
  lat: number | string;
  lng: number | string;
  is_verified: boolean;
  submitted_at: string;
  updated_at?: string | null;
  clinic_status?: string | null;
  delay_minutes?: number | null;
  bookings_closed?: boolean | null;
};

function rowToClinic(r: Row): Clinic {
  return {
    id: r.id,
    doctor: r.doctor,
    specialtyId: r.specialty_id,
    address: r.address,
    area: r.area,
    phone: r.phone,
    price: Number(r.price) || 0,
    rating: Number(r.rating) || 0,
    reviews: r.reviews,
    availableNow: r.available_now,
    distanceKm: Number(r.distance_km) || 0,
    nowServing: r.now_serving,
    yourNumber: r.your_number,
    waitingCount: r.waiting_count,
    lat: Number(r.lat) || 0,
    lng: Number(r.lng) || 0,
    isVerified: r.is_verified,
    submittedAt: new Date(r.submitted_at).getTime(),
    updatedAt: r.updated_at ? new Date(r.updated_at).getTime() : new Date(r.submitted_at).getTime(),
    clinicStatus: (r.clinic_status as ClinicStatus) || "normal",
    delayMinutes: Number(r.delay_minutes) || 0,
    bookingsClosed: Boolean(r.bookings_closed),
    workingHours: String((r as { working_hours?: string }).working_hours ?? ""),
    youtubeUrl: String((r as { youtube_url?: string }).youtube_url ?? ""),
  };
}

export async function setClinicOps(input: {
  id: string;
  nowServing?: number;
  clinicStatus?: ClinicStatus;
  delayMinutes?: number;
  bookingsClosed?: boolean;
}): Promise<Clinic | null> {
  try {
    const { row } = await svrSetClinicOps({ data: input });
    return rowToClinic(row as Row);
  } catch {
    return null;
  }
}

/** Live updates for one clinic row (queue number, status, closed flag). */
export function subscribeClinic(id: string, onChange: (c: Clinic) => void) {
  const channel = supabase
    .channel(`clinic-${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "clinics", filter: `id=eq.${id}` },
      (payload) => {
        const row = payload.new as unknown as Row;
        if (row?.id) onChange(rowToClinic(row));
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getVerifiedClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("is_disabled", false)
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (error) return [];
  return (data as Row[]).map(rowToClinic);
}

/** Server-side paginated clinic list (page starts at 0). */
export async function getClinicsPage(page = 0, size = 20): Promise<{ rows: Clinic[]; hasMore: boolean }> {
  const from = page * size;
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("is_disabled", false)
    .order("submitted_at", { ascending: false })
    .range(from, from + size);
  if (error || !data) return { rows: [], hasMore: false };
  return { rows: (data as Row[]).slice(0, size).map(rowToClinic), hasMore: data.length > size };
}

export async function getVerifiedClinic(id: string): Promise<Clinic | undefined> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .eq("is_disabled", false)
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToClinic(data as Row);
}

export async function getClinicById(id: string): Promise<Clinic | undefined> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToClinic(data as Row);
}

export async function upsertClinic(
  input: Omit<
    Clinic,
    "id" | "isVerified" | "submittedAt" | "updatedAt" | "clinicStatus" | "delayMinutes" | "bookingsClosed"
  > & { id?: string },
): Promise<Clinic | null> {
  if (input.id) {
    try {
      const { row } = await svrUpdateClinic({
        data: {
          id: input.id,
          doctor: input.doctor,
          specialtyId: input.specialtyId,
          address: input.address,
          area: input.area,
          phone: input.phone,
          price: input.price,
          availableNow: input.availableNow,
          lat: input.lat,
          lng: input.lng,
        },
      });
      return rowToClinic(row as Row);
    } catch {
      return null;
    }
  }
  try {
    const { row } = await svrCreateClinic({
      data: {
        doctor: input.doctor,
        specialtyId: input.specialtyId,
        address: input.address,
        area: input.area,
        phone: input.phone,
        price: input.price,
        availableNow: input.availableNow,
        lat: input.lat,
        lng: input.lng,
      },
    });
    return rowToClinic(row as Row);
  } catch {
    return null;
  }
}

/** Identity now comes from the real signed-in session, not the device. */
export async function getCurrentSession() {
  if (!isBrowser()) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export type ClinicMembership = {
  clinic: Clinic | undefined;
  role: "doctor" | "secretary" | null;
};

/** The clinic of the signed-in doctor/secretary (server-verified). */
export async function getMyClinicMembership(): Promise<ClinicMembership> {
  const session = await getCurrentSession();
  if (!session) return { clinic: undefined, role: null };
  try {
    const res = await svrMyClinic();
    return {
      clinic: res.row ? rowToClinic(res.row as unknown as Row) : undefined,
      role: (res.role as "doctor" | "secretary" | null) ?? null,
    };
  } catch {
    return { clinic: undefined, role: null };
  }
}

export async function getCurrentDoctorClinic(): Promise<Clinic | undefined> {
  return (await getMyClinicMembership()).clinic;
}

/** Creates the doctor login + the unverified clinic, then signs the doctor in. */
export async function registerDoctorAccount(input: {
  email: string;
  password: string;
  doctor: string;
  specialtyId: string;
  phone: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
  try {
    await svrRegisterDoctor({ data: input });
  } catch (e) {
    return { ok: false, code: (e as Error)?.message || "SIGNUP_FAILED" };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });
  if (error) return { ok: false, code: error.message };
  return { ok: true };
}

export async function signOutStaff() {
  const { clearAllLocalUserData } = await import("@/lib/user-profile-cache");
  clearAllLocalUserData();
  await supabase.auth.signOut();
}

// Bookings
export type Booking = {
  id: string;
  code: string;
  clinicId: string;
  patientName: string;
  patientPhone: string;
  dayLabel: string;
  slot: string;
  queueNumber: number;
  status: "waiting" | "in" | "done" | "cancelled";
  createdAt: number;
  visitType: "new" | "followup";
};

type BookingRow = {
  id: string;
  code: string;
  clinic_id: string;
  patient_name: string;
  patient_phone: string;
  day_label: string;
  slot: string;
  queue_number: number;
  status: string;
  created_at: string;
  visit_type?: string | null;
};

function rowToBooking(r: BookingRow): Booking {
  return {
    id: r.id,
    code: r.code,
    clinicId: r.clinic_id,
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    dayLabel: r.day_label,
    slot: r.slot,
    queueNumber: r.queue_number,
    status: (r.status as Booking["status"]) || "waiting",
    createdAt: new Date(r.created_at).getTime(),
    visitType: r.visit_type === "followup" ? "followup" : "new",
  };
}

export async function createBooking(input: {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  dayLabel: string;
  slot: string;
  visitType?: "new" | "followup";
}): Promise<Booking | null> {
  try {
    const res = await svrCreateBooking({ data: input });
    return {
      id: res.id,
      code: res.code,
      clinicId: input.clinicId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      dayLabel: input.dayLabel,
      slot: input.slot,
      queueNumber: res.queueNumber,
      status: "waiting",
      createdAt: Date.now(),
      visitType: input.visitType ?? "new",
    };
  } catch {
    return null;
  }
}

/** Walk-in patients added by the clinic secretary (bypasses the closed-bookings flag). */
export async function addWalkIn(input: {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  slot: string;
  visitType?: "new" | "followup";
}): Promise<boolean> {
  try {
    await svrAddWalkIn({ data: input });
    return true;
  } catch {
    return false;
  }
}

export async function listBookingsForClinic(clinicId: string): Promise<Booking[]> {
  try {
    const { rows } = await svrListBookingsForClinic({ data: { clinicId } });
    return (rows as BookingRow[]).map(rowToBooking);
  } catch {
    return [];
  }
}

export async function updateBookingStatus(id: string, status: Booking["status"]) {
  try {
    await svrUpdateBookingStatus({ data: { id, status } });
  } catch {
    // ignore
  }
}

export const timeSlots = [
  "١٠:٠٠ ص",
  "١٠:٣٠ ص",
  "١١:٠٠ ص",
  "١١:٣٠ ص",
  "١٢:٠٠ م",
  "١٢:٣٠ م",
  "٤:٠٠ م",
  "٤:٣٠ م",
  "٥:٠٠ م",
  "٥:٣٠ م",
  "٦:٠٠ م",
  "٧:٠٠ م",
  "٧:٣٠ م",
  "٨:٠٠ م",
];

export const days = [
  { label: "اليوم", date: "٢٤ يوليو" },
  { label: "بكرة", date: "٢٥ يوليو" },
  { label: "السبت", date: "٢٦ يوليو" },
  { label: "الأحد", date: "٢٧ يوليو" },
  { label: "الاثنين", date: "٢٨ يوليو" },
];

export function getSpecialty(id: string) {
  return specialties.find((s) => s.id === id);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}