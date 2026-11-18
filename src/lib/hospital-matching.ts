import { getSpecialty } from "@/lib/mock-data";
import type { Hospital as HospitalRow } from "@/lib/hospitals.functions";

export function hospitalMatchesSpecialty(hospital: HospitalRow, specialtyIds: string[]): boolean {
  const departments = (hospital.departments ?? []).join(" ");
  if (!departments) return false;
  return specialtyIds.some((id) => {
    const keywords: Record<string, string[]> = {
      pediatrics: ["أطفال", "اطفال", "صدرية أطفال"],
      neonatology: ["حديثي الولادة", "أطفال", "حضانات"],
      dental: ["أسنان", "اسنان", "فم"],
      ophthalmology: ["عيون", "رمد"],
      ent: ["أنف", "انف", "أذن", "حنجرة", "سمعيات"],
      orthopedics: ["عظام", "كسور", "مفاصل"],
      dermatology: ["جلدية", "تناسلية"],
      gynecology: ["نساء", "توليد", "ولادة"],
      cardiology: ["قلب", "أوعية دموية"],
      neurology: ["مخ", "أعصاب", "اعصاب"],
      "internal-medicine": ["باطنة", "باطني"],
      general: ["باطنة", "عام", "طوارئ"],
      urology: ["مسالك", "كلى", "كلي"],
      psychiatry: ["نفسي", "عصبي"],
      physiotherapy: ["علاج طبيعي", "تأهيل"],
      nutrition: ["تغذية"],
      "family-medicine": ["أسرة", "عام"],
    };
    return (keywords[id] ?? [getSpecialty(id)?.name ?? ""]).some((keyword) =>
      keyword ? departments.includes(keyword) : false,
    );
  });
}
