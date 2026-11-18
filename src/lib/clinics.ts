/* Clinic data access: types, row mapping, verified-clinic queries and ops. */

import { supabase } from "@/integrations/supabase/client";
import { svrUpdateClinic, svrCreateClinic, svrSetClinicOps } from "@/lib/data.functions";
import { specialties } from "./specialties.ts";
import { developmentDemoClinics } from "./demo-clinics.ts";

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
  /** Professional-verification lifecycle: "pending_verification" until admin grants the badge. */
  verificationStatus?: "pending_verification" | "verified" | "rejected";
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
  /** Synthetic clinic data used only when the development database has no clinics. */
  isDemo?: boolean;
  /** Bundled cover photo for demo clinics. */
  coverUrl?: string;
};

export type ClinicStatus = "normal" | "delayed" | "paused";

export const clinicStatusLabels: Record<ClinicStatus, { label: string; dot: string }> = {
  normal: { label: "تعمل كالمعتاد", dot: "🟢" },
  delayed: { label: "تأخير في المواعيد", dot: "🟡" },
  paused: { label: "متوقفة مؤقتاً", dot: "🔴" },
};

export type Row = {
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
  is_demo?: boolean | null;
};

const demoClinicIds = new Set([
  "11111111-0000-4000-8000-000000000001",
  "11111111-0000-4000-8000-000000000002",
  "11111111-0000-4000-8000-000000000003",
  "11111111-0000-4000-8000-000000000004",
  "11111111-0000-4000-8000-000000000005",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Maps a clinic row (typed `Row`, or an untyped realtime/server payload) to a
 * `Clinic`. Fields are narrowed defensively: a realtime `payload.new` is only
 * `{ [key: string]: any }`, so no caller needs a cast to feed it here.
 */
export function rowToClinic(input: unknown): Clinic {
  const r: Record<string, unknown> = isRecord(input) ? input : {};
  const str = (key: string): string => {
    const v = r[key];
    return typeof v === "string" ? v : v == null ? "" : String(v);
  };
  const num = (key: string): number => Number(r[key]) || 0;
  const int = (key: string): number => {
    const v = r[key];
    return typeof v === "number" ? v : Number(v) || 0;
  };
  const id = str("id");
  const isVerified = Boolean(r.is_verified);
  const submittedAt = str("submitted_at");
  const updatedAt = str("updated_at");
  const verificationStatusRaw = r.verification_status;
  const clinicStatusRaw = r.clinic_status;
  return {
    id,
    doctor: str("doctor"),
    specialtyId: str("specialty_id"),
    address: str("address"),
    area: str("area"),
    phone: str("phone"),
    price: num("price"),
    rating: num("rating"),
    reviews: int("reviews"),
    availableNow: Boolean(r.available_now),
    distanceKm: num("distance_km"),
    nowServing: int("now_serving"),
    yourNumber: int("your_number"),
    waitingCount: int("waiting_count"),
    lat: num("lat"),
    lng: num("lng"),
    isVerified,
    isDemo: typeof r.is_demo === "boolean" ? r.is_demo : demoClinicIds.has(id),
    verificationStatus: isVerified
      ? "verified"
      : verificationStatusRaw === "rejected"
        ? "rejected"
        : "pending_verification",
    submittedAt: new Date(submittedAt).getTime(),
    updatedAt: updatedAt ? new Date(updatedAt).getTime() : new Date(submittedAt).getTime(),
    clinicStatus:
      clinicStatusRaw === "delayed" || clinicStatusRaw === "paused" ? clinicStatusRaw : "normal",
    delayMinutes: num("delay_minutes"),
    bookingsClosed: Boolean(r.bookings_closed),
    workingHours: str("working_hours"),
    youtubeUrl: str("youtube_url"),
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
        const row = payload.new;
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
    .eq("is_verified", true)
    .order("submitted_at", { ascending: false })
    .limit(300);
  if (error) return [];
  if (import.meta.env.DEV && data.length === 0) return developmentDemoClinics;
  return (data as Row[]).map(rowToClinic);
}

export async function getVerifiedClinic(id: string): Promise<Clinic | undefined> {
  const demoClinic = import.meta.env.DEV
    ? developmentDemoClinics.find((clinic) => clinic.id === id)
    : undefined;
  if (demoClinic) return demoClinic;

  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .eq("is_disabled", false)
    .eq("is_verified", true)
    .maybeSingle();
  if (error || !data) return undefined;
  return rowToClinic(data as Row);
}

export async function getClinicById(id: string): Promise<Clinic | undefined> {
  const demoClinic = import.meta.env.DEV
    ? developmentDemoClinics.find((clinic) => clinic.id === id)
    : undefined;
  if (demoClinic) return demoClinic;
  const { data, error } = await supabase.from("clinics").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return rowToClinic(data as Row);
}

export async function upsertClinic(
  input: Omit<
    Clinic,
    | "id"
    | "isVerified"
    | "submittedAt"
    | "updatedAt"
    | "clinicStatus"
    | "delayMinutes"
    | "bookingsClosed"
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

export function getSpecialty(id: string) {
  return specialties.find((s) => s.id === id);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
