import doctorMale from "@/assets/avatar-doctor-male.jpg.asset.json";
import doctorFemale from "@/assets/avatar-doctor-female.jpg.asset.json";
import patient from "@/assets/avatar-patient.jpg.asset.json";

export const DEFAULT_PATIENT_AVATAR = patient.url;

/** Female doctor default when the name clearly indicates "دكتورة". */
export function defaultDoctorAvatar(name = ""): string {
  return /^\s*(دكتورة|د\s*\/\s*ة|الدكتورة)/.test(name) ? doctorFemale.url : doctorMale.url;
}
