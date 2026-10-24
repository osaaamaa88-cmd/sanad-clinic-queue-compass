import { supabase } from "@/integrations/supabase/client";

export type EmergencyFacility = {
  id: string;
  name: string;
  type: "hospital" | "radiology" | "clinic" | "pharmacy";
  area: string;
  address: string;
  phone: string;
  distanceKm: number;
  open24h: boolean;
  openNow: boolean;
  lat: number;
  lng: number;
};

export const emergencyHotlines = [
  { id: "amb", label: "الإسعاف", phone: "123", emoji: "🚑" },
  { id: "pol", label: "الشرطة", phone: "122", emoji: "🚓" },
  { id: "fire", label: "الحريق", phone: "180", emoji: "🚒" },
  { id: "poison", label: "التسمم", phone: "0225106603", emoji: "☠️" },
];

const FAC_KEY = "sanad.cache.emergencyFacilities";

function readCachedFacilities(): EmergencyFacility[] {
  try {
    return JSON.parse(localStorage.getItem(FAC_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Network first; falls back to the last saved copy on this device when offline. */
export async function listEmergencyFacilities(): Promise<EmergencyFacility[]> {
  if (typeof window !== "undefined" && !navigator.onLine) return readCachedFacilities();
  const { data, error } = await supabase
    .from("emergency_facilities")
    .select("*")
    .order("distance_km", { ascending: true });
  if (error || !data) return typeof window !== "undefined" ? readCachedFacilities() : [];
  const list: EmergencyFacility[] = data.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as EmergencyFacility["type"],
    area: r.area,
    address: r.address,
    phone: r.phone,
    distanceKm: Number(r.distance_km) || 0,
    open24h: r.open_24h,
    openNow: r.open_now,
    lat: Number(r.lat) || 0,
    lng: Number(r.lng) || 0,
  }));
  try {
    localStorage.setItem(FAC_KEY, JSON.stringify(list));
  } catch {}
  return list;
}

export const facilityTypeLabel: Record<
  EmergencyFacility["type"],
  { label: string; emoji: string }
> = {
  hospital: { label: "مستشفى", emoji: "🏥" },
  radiology: { label: "أشعة", emoji: "🩻" },
  clinic: { label: "عيادة", emoji: "🩺" },
  pharmacy: { label: "صيدلية", emoji: "💊" },
};
