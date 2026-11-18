import type { Booking } from "@/lib/mock-data";

const CACHE_PREFIX = "sanad.bookings.cache.v1.";
const LEGACY_CACHE_PREFIX = "sandi.bookings.cache.v1.";

export function readBookingsCache(clinicId: string): Booking[] {
  try {
    const key = CACHE_PREFIX + clinicId;
    const raw = localStorage.getItem(key) ?? localStorage.getItem(LEGACY_CACHE_PREFIX + clinicId);
    if (raw && !localStorage.getItem(key)) localStorage.setItem(key, raw);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

export function writeBookingsCache(clinicId: string, rows: Booking[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + clinicId, JSON.stringify(rows));
  } catch {
    /* ignore quota errors */
  }
}
