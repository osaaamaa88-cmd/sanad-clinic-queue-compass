/* Barrel: re-exports the split data-access modules below so existing imports keep working. */
export { specialties } from "./specialties.ts";
export type { Specialty } from "./specialties.ts";

export type { Clinic, ClinicStatus } from "./clinics.ts";
export {
  clinicStatusLabels,
  setClinicOps,
  subscribeClinic,
  getVerifiedClinics,
  getVerifiedClinic,
  getClinicById,
  upsertClinic,
  getSpecialty,
  whatsappLink,
} from "./clinics.ts";

export type { ClinicMembership } from "./staff-membership.ts";
export { getMyClinicMembership, registerDoctorAccount, signOutStaff } from "./staff-membership.ts";

export type { Booking } from "./bookings.ts";
export {
  createBooking,
  addWalkIn,
  listBookingsForClinic,
  updateBookingStatus,
} from "./bookings.ts";

export { timeSlots, days } from "./booking-slots.ts";
