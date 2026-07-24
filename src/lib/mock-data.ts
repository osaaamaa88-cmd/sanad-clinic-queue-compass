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
};

export const clinics: Clinic[] = [
  {
    id: "c1",
    doctor: "د. أحمد السيد",
    specialtyId: "dental",
    address: "شارع الهرم، عمارة ٢٤، الدور الثالث",
    area: "الجيزة",
    distanceKm: 0.8,
    price: 200,
    rating: 4.8,
    reviews: 214,
    availableNow: true,
    phone: "201001234567",
    nowServing: 7,
    yourNumber: 12,
    waitingCount: 5,
    lat: 30.0131,
    lng: 31.2089,
  },
  {
    id: "c2",
    doctor: "د. منى فتحي",
    specialtyId: "pediatrics",
    address: "شارع مصطفى النحاس، برج النور، الدور الأول",
    area: "مدينة نصر",
    distanceKm: 1.5,
    price: 250,
    rating: 4.9,
    reviews: 389,
    availableNow: true,
    phone: "201007654321",
    nowServing: 3,
    yourNumber: 6,
    waitingCount: 3,
    lat: 30.0626,
    lng: 31.3486,
  },
  {
    id: "c3",
    doctor: "د. خالد عبد الرحمن",
    specialtyId: "internal",
    address: "شارع التحرير، عمارة ١٢، الدور الرابع",
    area: "الدقي",
    distanceKm: 2.3,
    price: 300,
    rating: 4.6,
    reviews: 156,
    availableNow: false,
    phone: "201009876543",
    nowServing: 0,
    yourNumber: 0,
    waitingCount: 0,
    lat: 30.0378,
    lng: 31.2117,
  },
  {
    id: "c4",
    doctor: "د. سارة إبراهيم",
    specialtyId: "derma",
    address: "شارع جامعة الدول العربية، عمارة ٧٨",
    area: "المهندسين",
    distanceKm: 3.1,
    price: 350,
    rating: 4.7,
    reviews: 267,
    availableNow: true,
    phone: "201005555555",
    nowServing: 14,
    yourNumber: 18,
    waitingCount: 4,
    lat: 30.0561,
    lng: 31.2003,
  },
  {
    id: "c5",
    doctor: "د. محمد رأفت",
    specialtyId: "ortho",
    address: "شارع أحمد عرابي، برج الأطباء، الدور ٥",
    area: "المهندسين",
    distanceKm: 3.4,
    price: 400,
    rating: 4.5,
    reviews: 98,
    availableNow: false,
    phone: "201004444444",
    nowServing: 0,
    yourNumber: 0,
    waitingCount: 0,
    lat: 30.0605,
    lng: 31.2094,
  },
  {
    id: "c6",
    doctor: "د. ياسمين علي",
    specialtyId: "gyneco",
    address: "شارع النزهة، عمارة ٥، الدور الثاني",
    area: "مصر الجديدة",
    distanceKm: 4.2,
    price: 300,
    rating: 4.9,
    reviews: 412,
    availableNow: true,
    phone: "201003333333",
    nowServing: 9,
    yourNumber: 11,
    waitingCount: 2,
    lat: 30.0987,
    lng: 31.3255,
  },
];

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

export function getClinic(id: string) {
  return clinics.find((c) => c.id === id);
}

export function getSpecialty(id: string) {
  return specialties.find((s) => s.id === id);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}