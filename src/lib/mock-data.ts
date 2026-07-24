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
  isVerified: boolean;
  submittedAt: number;
};

// قاعدة البيانات فارغة — الأطباء يسجّلون من واجهة الطبيب ثم يتم توثيقهم من الأدمن.
const STORAGE_KEY = "tabibak.clinics.v1";
const CURRENT_DOCTOR_KEY = "tabibak.currentDoctorId.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAllClinics(): Clinic[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Clinic[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: Clinic[]) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("tabibak:clinics-changed"));
}

export function getVerifiedClinics(): Clinic[] {
  return getAllClinics().filter((c) => c.isVerified);
}

export function getPendingClinics(): Clinic[] {
  return getAllClinics().filter((c) => !c.isVerified);
}

export function getClinic(id: string): Clinic | undefined {
  return getAllClinics().find((c) => c.id === id);
}

export function upsertClinic(input: Omit<Clinic, "id" | "isVerified" | "submittedAt"> & { id?: string }): Clinic {
  const list = getAllClinics();
  if (input.id) {
    const idx = list.findIndex((c) => c.id === input.id);
    if (idx >= 0) {
      const merged: Clinic = { ...list[idx], ...input, id: input.id };
      list[idx] = merged;
      saveAll(list);
      return merged;
    }
  }
  const id = input.id ?? `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const created: Clinic = {
    ...input,
    id,
    isVerified: false,
    submittedAt: Date.now(),
  };
  list.push(created);
  saveAll(list);
  return created;
}

export function verifyClinic(id: string) {
  const list = getAllClinics().map((c) => (c.id === id ? { ...c, isVerified: true } : c));
  saveAll(list);
}

export function deleteClinic(id: string) {
  saveAll(getAllClinics().filter((c) => c.id !== id));
}

export function getCurrentDoctorId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(CURRENT_DOCTOR_KEY);
}

export function setCurrentDoctorId(id: string | null) {
  if (!isBrowser()) return;
  if (id) localStorage.setItem(CURRENT_DOCTOR_KEY, id);
  else localStorage.removeItem(CURRENT_DOCTOR_KEY);
}

export function getCurrentDoctorClinic(): Clinic | undefined {
  const id = getCurrentDoctorId();
  return id ? getClinic(id) : undefined;
}

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

export function getSpecialty(id: string) {
  return specialties.find((s) => s.id === id);
}

export function whatsappLink(phone: string, message: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}