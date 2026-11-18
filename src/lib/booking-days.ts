/* Booking day labels: the next 5 days, generated from today.
   (Was a hardcoded list from July 2025 — patients booking in November
   were shown July dates, saved to the DB and sent in the WhatsApp
   confirmation. Keep the exact label/date shape the drawer expects.) */

export type BookingDay = { label: string; date: string };

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

const ARABIC_WEEKDAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toEasternDigits(value: number): string {
  return String(value).replace(/\d/g, (d) => EASTERN_DIGITS[Number(d)] ?? d);
}

export function buildBookingDays(count = 5): BookingDay[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      label: i === 0 ? "اليوم" : i === 1 ? "بكرة" : (ARABIC_WEEKDAYS[d.getDay()] ?? "الأحد"),
      date: `${toEasternDigits(d.getDate())} ${ARABIC_MONTHS[d.getMonth()]}`,
    };
  });
}

export const days: BookingDay[] = buildBookingDays();
