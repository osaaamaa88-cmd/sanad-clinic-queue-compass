/** Shared, browser-safe input rules for phone numbers and vital readings. */

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

export function toLatinDigits(s: string): string {
  return s.replace(ARABIC_DIGITS, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });
}

/** Returns an 11-digit Egyptian mobile (010/011/012/015) or null. Accepts +20/0020 and Arabic digits. */
export function normalizeEgyptianMobile(input: string): string | null {
  let d = toLatinDigits(input).replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[0125]\d{8}$/.test(d) ? d : null;
}

/** Parses a number typed with Latin or Arabic digits; null when empty/invalid. */
export function parseReading(input: string): number | null {
  const t = toLatinDigits(input).replace("٫", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const VITAL_LIMITS = {
  systolic: [60, 260],
  diastolic: [30, 160],
  sugar: [20, 700],
} as const;

export function bloodPressureError(sys: number | null, dia: number | null): string | null {
  if (sys == null || dia == null) return null;
  const [smin, smax] = VITAL_LIMITS.systolic;
  const [dmin, dmax] = VITAL_LIMITS.diastolic;
  if (sys < smin || sys > smax) return `الرقم الكبير لازم يكون بين ${smin} و ${smax}`;
  if (dia < dmin || dia > dmax) return `الرقم الصغير لازم يكون بين ${dmin} و ${dmax}`;
  if (dia >= sys) return "الرقم الكبير لازم يكون أكبر من الرقم الصغير";
  return null;
}

export function sugarError(v: number | null): string | null {
  if (v == null) return null;
  const [min, max] = VITAL_LIMITS.sugar;
  return v < min || v > max ? `قراءة السكر لازم تكون بين ${min} و ${max}` : null;
}
