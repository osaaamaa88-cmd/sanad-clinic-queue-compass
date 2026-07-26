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

export const emergencyFacilities: EmergencyFacility[] = [
  {
    id: "e1",
    name: "مستشفى الشيخ زايد التخصصي",
    type: "hospital",
    area: "الشيخ زايد، الجيزة",
    address: "المحور المركزي، الشيخ زايد",
    phone: "01000000001",
    distanceKm: 2.4,
    open24h: true,
    openNow: true,
    lat: 30.0705,
    lng: 30.9756,
  },
  {
    id: "e2",
    name: "مستشفى الدكتور سامي حنا للطوارئ",
    type: "hospital",
    area: "المهندسين، الجيزة",
    address: "شارع جامعة الدول العربية",
    phone: "01000000002",
    distanceKm: 1.1,
    open24h: true,
    openNow: true,
    lat: 30.0561,
    lng: 31.2004,
  },
  {
    id: "e3",
    name: "مركز أشعة المقطم — 24 ساعة",
    type: "radiology",
    area: "المقطم، القاهرة",
    address: "شارع 9، المقطم",
    phone: "01000000003",
    distanceKm: 6.8,
    open24h: true,
    openNow: true,
    lat: 30.0131,
    lng: 31.3086,
  },
  {
    id: "e4",
    name: "الألفا سكان — فرع مدينة نصر",
    type: "radiology",
    area: "مدينة نصر، القاهرة",
    address: "شارع مكرم عبيد",
    phone: "01000000004",
    distanceKm: 4.3,
    open24h: false,
    openNow: true,
    lat: 30.0596,
    lng: 31.3401,
  },
  {
    id: "e5",
    name: "عيادة الحياة — طوارئ 24 ساعة",
    type: "clinic",
    area: "الدقي، الجيزة",
    address: "شارع التحرير، الدقي",
    phone: "01000000005",
    distanceKm: 0.9,
    open24h: true,
    openNow: true,
    lat: 30.0384,
    lng: 31.2118,
  },
  {
    id: "e6",
    name: "صيدلية العزبي — فرع 24 ساعة",
    type: "pharmacy",
    area: "المهندسين، الجيزة",
    address: "شارع شهاب",
    phone: "19600",
    distanceKm: 1.5,
    open24h: true,
    openNow: true,
    lat: 30.0587,
    lng: 31.2013,
  },
  {
    id: "e7",
    name: "مستشفى دار الفؤاد",
    type: "hospital",
    area: "مدينة 6 أكتوبر",
    address: "المحور المركزي، 6 أكتوبر",
    phone: "01000000007",
    distanceKm: 12.2,
    open24h: true,
    openNow: true,
    lat: 29.9668,
    lng: 30.9445,
  },
  {
    id: "e8",
    name: "مركز أشعة المهندسين",
    type: "radiology",
    area: "المهندسين، الجيزة",
    address: "شارع السودان",
    phone: "01000000008",
    distanceKm: 1.8,
    open24h: false,
    openNow: false,
    lat: 30.0602,
    lng: 31.2028,
  },
];

export const facilityTypeLabel: Record<EmergencyFacility["type"], { label: string; emoji: string }> = {
  hospital: { label: "مستشفى", emoji: "🏥" },
  radiology: { label: "أشعة", emoji: "🩻" },
  clinic: { label: "عيادة", emoji: "🩺" },
  pharmacy: { label: "صيدلية", emoji: "💊" },
};