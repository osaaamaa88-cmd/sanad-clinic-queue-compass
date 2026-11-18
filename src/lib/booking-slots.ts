/* Booking time slots and day labels (Arabic UI strings, unchanged). */
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

/* Days are generated from today in booking-days.ts (was a hardcoded
   July 2025 list — rebased here from fix-booking-dates, whose mock-data.ts
   edit no longer applies after the Phase B mock-data split). */
export { days } from "./booking-days.ts";
export type { BookingDay } from "./booking-days.ts";
