import type { Hospital } from "@/lib/hospitals.functions";
import type { Clinic } from "@/lib/mock-data";

/** المسافة بالكيلومتر بين نقطتين (صيغة هافرساين)، مقرّبة لعُشر. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371,
    t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t,
    dLng = (b.lng - a.lng) * t;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** يحوّل صف مستشفى حكومي إلى عيادة قابلة للعرض في البحث والخريطة. */
export function hospitalToClinic(h: Hospital, pos: { lat: number; lng: number }): Clinic {
  const lat = Number(h.lat),
    lng = Number(h.lng);
  return {
    id: h.id,
    doctor: h.name,
    specialtyId: "emergency",
    address: h.address || h.district,
    area: h.governorate,
    distanceKm: kmBetween(pos, { lat, lng }),
    price: 0,
    rating: 0,
    reviews: 0,
    availableNow: h.emergency_24h,
    phone: h.emergency_phone || h.phone || "123",
    nowServing: 0,
    yourNumber: 0,
    waitingCount: 0,
    lat,
    lng,
    isVerified: true,
    submittedAt: 0,
    updatedAt: 0,
    clinicStatus: "normal",
    delayMinutes: 0,
    bookingsClosed: false,
    kind: "hospital",
    approxLocation: !h.location_verified,
    hospitalType: h.hospital_type,
  };
}
