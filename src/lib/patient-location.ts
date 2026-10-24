export type PatientLocation = {
  name: string;
  city: string;
  lat: number;
  lng: number;
  gps?: boolean;
};

const KEY = "sanad.patient.location";

export const egyptAreas: PatientLocation[] = [
  { name: "المهندسين", city: "الجيزة", lat: 30.0566, lng: 31.2005 },
  { name: "الدقي", city: "الجيزة", lat: 30.0384, lng: 31.2114 },
  { name: "6 أكتوبر", city: "الجيزة", lat: 29.9381, lng: 30.9137 },
  { name: "الشيخ زايد", city: "الجيزة", lat: 30.0444, lng: 30.9765 },
  { name: "الهرم", city: "الجيزة", lat: 29.9929, lng: 31.1569 },
  { name: "وسط البلد", city: "القاهرة", lat: 30.0444, lng: 31.2357 },
  { name: "المعادي", city: "القاهرة", lat: 29.9602, lng: 31.2569 },
  { name: "مدينة نصر", city: "القاهرة", lat: 30.0566, lng: 31.3301 },
  { name: "مصر الجديدة", city: "القاهرة", lat: 30.0911, lng: 31.3225 },
  { name: "التجمع الخامس", city: "القاهرة", lat: 30.0074, lng: 31.4913 },
  { name: "شبرا", city: "القاهرة", lat: 30.0961, lng: 31.2422 },
  { name: "الإسكندرية", city: "الإسكندرية", lat: 31.2001, lng: 29.9187 },
  { name: "المنصورة", city: "الدقهلية", lat: 31.0409, lng: 31.3785 },
  { name: "طنطا", city: "الغربية", lat: 30.7865, lng: 31.0004 },
  { name: "الزقازيق", city: "الشرقية", lat: 30.5877, lng: 31.502 },
  { name: "أسيوط", city: "أسيوط", lat: 27.1809, lng: 31.1837 },
  { name: "المنيا", city: "المنيا", lat: 28.0871, lng: 30.7618 },
  { name: "سوهاج", city: "سوهاج", lat: 26.5591, lng: 31.6957 },
  { name: "الأقصر", city: "الأقصر", lat: 25.6872, lng: 32.6396 },
  { name: "أسوان", city: "أسوان", lat: 24.0889, lng: 32.8998 },
];

export const defaultLocation = egyptAreas[0];

export function getPatientLocation(): PatientLocation {
  if (typeof window === "undefined") return defaultLocation;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PatientLocation) : defaultLocation;
  } catch {
    return defaultLocation;
  }
}

export function savePatientLocation(loc: PatientLocation) {
  localStorage.setItem(KEY, JSON.stringify(loc));
  window.dispatchEvent(new Event("sanad-location"));
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function nearestArea(lat: number, lng: number) {
  return egyptAreas.reduce((best, a) =>
    distanceKm(a, { lat, lng }) < distanceKm(best, { lat, lng }) ? a : best,
  );
}

export function detectGpsLocation(): Promise<PatientLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("جهازك لا يدعم تحديد الموقع."));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const near = nearestArea(p.coords.latitude, p.coords.longitude);
        resolve({
          name: `بالقرب من ${near.name}`,
          city: near.city,
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          gps: true,
        });
      },
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? "اسمح للتطبيق بالوصول لموقعك من إعدادات المتصفح."
              : "تعذّر تحديد موقعك، جرّب مرة أخرى أو اختر منطقتك.",
          ),
        ),
      { timeout: 10000, enableHighAccuracy: true },
    );
  });
}
