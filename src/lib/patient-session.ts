import { supabase } from "@/integrations/supabase/client";
import { saveCachedProfile } from "@/lib/user-profile-cache";

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
const LEGACY_KEY = "sanady.patient.session";
const LEGACY_BOOKINGS_KEY = "sanady.patient.bookings";

function readAndMigrate(key: string, legacyKey: string): string | null {
  const current = window.localStorage.getItem(key);
  if (current) return current;
  const legacy = window.localStorage.getItem(legacyKey);
  if (legacy) window.localStorage.setItem(key, legacy);
  return legacy;
}

export function getPatientSession(): PatientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readAndMigrate(KEY, LEGACY_KEY);
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
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}

export async function ensurePatientAuthIdentity(): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user?.id) throw new Error("ANONYMOUS_AUTH_FAILED");
  return data.user.id;
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
  const phone = user.phone || getPatientSession()?.phone || "";
  const avatar =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    undefined;
  saveCachedProfile({ userId: user.id, name, email: user.email, avatar, phone, role: "patient" });
  return savePatientSession({ name, phone, userId: user.id, via: "google" });
}

/** Booking codes kept on the device so the patient can follow the queue later. */
export type SavedBooking = {
  code: string;
  clinicId: string;
  clinicName: string;
  dayLabel: string;
  slot: string;
  /** Queue number returned at booking time; absent on bookings saved before this field existed. */
  queueNumber?: number;
  status?: "waiting" | "in" | "done" | "cancelled";
  savedAt: number;
};

export function getSavedBookings(): SavedBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readAndMigrate(BOOKINGS_KEY, LEGACY_BOOKINGS_KEY);
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

export function updateSavedBookingStatuses(
  statuses: Array<{ code: string; status: SavedBooking["status"] }>,
) {
  if (typeof window === "undefined" || statuses.length === 0) return;
  try {
    const statusByCode = new Map(statuses.map((item) => [item.code, item.status]));
    const updated = getSavedBookings().map((booking) => {
      const status = statusByCode.get(booking.code);
      return status ? { ...booking, status } : booking;
    });
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("[PatientSession] Failed to update saved booking statuses:", error);
  }
}
