/**
 * Local cache of the signed-in user's basic profile for instant UI on reopen.
 * The auth session itself is persisted by the auth client (token storage);
 * this only holds display data and is wiped on logout.
 */
export type CachedProfile = {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
  phone?: string;
  role: "patient" | "doctor" | "secretary";
  clinicId?: string;
  cachedAt: number;
};

const KEY = "sanad.user.profile";

export function getCachedProfile(): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedProfile) : null;
  } catch {
    return null;
  }
}

export function saveCachedProfile(p: Omit<CachedProfile, "cachedAt">) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...p, cachedAt: Date.now() }));
  } catch {
    // ignore
  }
}

/** Remove every locally stored SANAD user artifact (profile, patient session, bookings). */
export function clearAllLocalUserData() {
  try {
    const ls = window.localStorage;
    [
      KEY,
      "sanad.patient.session",
      "sanady.patient.session",
      "sanad.patient.bookings",
      "sanady.patient.bookings",
    ].forEach((k) => ls.removeItem(k));
  } catch {
    // ignore
  }
}
