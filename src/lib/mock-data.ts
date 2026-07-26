import { supabase } from "@/integrations/supabase/client";

export type Specialty = {
  id: string;
  name: string;
  emoji: string;
};

export const specialties: Specialty[] = [
  { id: "dental", name: "أسنان", emoji: "🦷" },
  { id: "internal", name: "باطنة", emoji: "🩺" },
  { id: "pediatrics", name: "أطفال", emoji: "👶" },
  { id: "ortho", name: "عظام", emoji: "🦴" },
  { id: "derma", name: "جلدية", emoji: "🧴" },
  { id: "cardio", name: "قلب", emoji: "❤️" },
  { id: "eye", name: "عيون", emoji: "👁️" },
  { id: "ent", name: "أنف وأذن", emoji: "👂" },
  { id: "gyneco", name: "نساء وتوليد", emoji: "🤰" },
  { id: "neuro", name: "مخ وأعصاب", emoji: "🧠" },
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
};

const CURRENT_DOCTOR_KEY = "tabibak.currentDoctorId.v1";

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
  };
}

export async function getVerifiedClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("is_verified", true)
    .order("submitted_at", { ascending: false });
  if (error) return [];
  return (data as Row[]).map(rowToClinic);
}

export async function getVerifiedClinic(id: string): Promise<Clinic | undefined> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .eq("is_verified", true)
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
  input: Omit<Clinic, "id" | "isVerified" | "submittedAt"> & { id?: string },
): Promise<Clinic | null> {
  const payload = {
    doctor: input.doctor,
    specialty_id: input.specialtyId,
    address: input.address,
    area: input.area,
    phone: input.phone,
    price: input.price,
    rating: input.rating,
    reviews: input.reviews,
    available_now: input.availableNow,
    distance_km: input.distanceKm,
    now_serving: input.nowServing,
    your_number: input.yourNumber,
    waiting_count: input.waitingCount,
    lat: input.lat,
    lng: input.lng,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("clinics")
      .update(payload)
      .eq("id", input.id)
      .select()
      .maybeSingle();
    if (error || !data) return null;
    return rowToClinic(data as Row);
  }
  const { data, error } = await supabase
    .from("clinics")
    .insert({ ...payload, is_verified: false })
    .select()
    .maybeSingle();
  if (error || !data) return null;
  return rowToClinic(data as Row);
}

export function getCurrentDoctorId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(CURRENT_DOCTOR_KEY);
}

export function setCurrentDoctorId(id: string | null) {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(CURRENT_DOCTOR_KEY, id);
  else localStorage.removeItem(CURRENT_DOCTOR_KEY);
}

export async function getCurrentDoctorClinic(): Promise<Clinic | undefined> {
  const id = getCurrentDoctorId();
  return id ? getClinicById(id) : undefined;
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
  status: "waiting" | "in" | "done";
  createdAt: number;
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
  };
}

export async function createBooking(input: {
  clinicId: string;
  patientName: string;
  patientPhone: string;
  dayLabel: string;
  slot: string;
}): Promise<Booking | null> {
  const code = `SND-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const { count } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", input.clinicId);
  const queueNumber = (count ?? 0) + 1;
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      code,
      clinic_id: input.clinicId,
      patient_name: input.patientName,
      patient_phone: input.patientPhone,
      day_label: input.dayLabel,
      slot: input.slot,
      queue_number: queueNumber,
      status: "waiting",
    })
    .select()
    .maybeSingle();
  if (error || !data) return null;
  return rowToBooking(data as BookingRow);
}

export async function listBookingsForClinic(clinicId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("queue_number", { ascending: true });
  if (error || !data) return [];
  return (data as BookingRow[]).map(rowToBooking);
}

export async function updateBookingStatus(id: string, status: Booking["status"]) {
  await supabase.from("bookings").update({ status }).eq("id", id);
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