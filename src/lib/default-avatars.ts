import patient from "@/assets/avatar-patient.jpg.asset.json";

export const DEFAULT_PATIENT_AVATAR = patient.url;

const DEFAULT_DOCTOR_AVATAR = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#e6f2ef"/><path d="M27 14h10v13h13v10H37v13H27V37H14V27h13z" fill="#0f766e"/></svg>',
)}`;

export function defaultDoctorAvatar(): string {
  return DEFAULT_DOCTOR_AVATAR;
}
