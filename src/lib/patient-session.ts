import { supabase } from "@/integrations/supabase/client";

export type PatientSession = {
  name: string;
  phone: string;
  /** Supabase auth user id when the patient signed in with Google */
  userId?: string;
  via: "guest" | "google";
  savedAt: number;
};

const KEY = "sanad.patient.session";
const BOOKINGS_KEY = "sanad.patient.bookings";

export function getPatientSession(): PatientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PatientSession;
    if (!s?.name) return null;
    return s;
  } catch {
    return null;
  }
}

export function savePatientSession(input: {
  name: string;
  phone: string;
  userId?: string;
  via?: PatientSession["via"];
}): PatientSession {
  const s: PatientSession = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    userId: input.userId,
    via: input.via ?? "guest",
    savedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
  return s;
}

export function clearPatientSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Pull name/phone from a Google session when available and persist it locally. */
export async function syncPatientSessionFromAuth(): Promise<PatientSession | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return getPatientSession();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    getPatientSession()?.name ||
    "";
  if (!name) return getPatientSession();
  return savePatientSession({
    name,
    phone: user.phone || getPatientSession()?.phone || "",
    userId: user.id,
    via: "google",
  });
}

/** Booking codes kept on the device so the patient can follow the queue later. */
export type SavedBooking = {
  code: string;
  clinicId: string;
  clinicName: string;
  dayLabel: string;
  slot: string;
  savedAt: number;
};

export function getSavedBookings(): SavedBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKINGS_KEY);
    return raw ? (JSON.parse(raw) as SavedBooking[]) : [];
  } catch {
    return [];
  }
}

export function saveBookingLocally(b: Omit<SavedBooking, "savedAt">) {
  try {
    const list = getSavedBookings().filter((x) => x.code !== b.code);
    list.unshift({ ...b, savedAt: Date.now() });
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch {
    // ignore
  }
}
