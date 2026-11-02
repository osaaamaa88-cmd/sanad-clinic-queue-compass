// Browser-safe rules that compare what a doctor typed with what was read from their card.

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
}

export function onlyDigits(value: string): string {
  return toLatinDigits(value).replace(/\D/g, "");
}

export function normalizeArabicName(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^(د|دكتور|دكتوره|الدكتور|الدكتوره)\.?\s+/u, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Share of the typed name's words found on the card (0..1). */
export function nameMatchScore(typed: string, extracted: string): number {
  const a = normalizeArabicName(typed).split(" ").filter(Boolean);
  const b = new Set(normalizeArabicName(extracted).split(" ").filter(Boolean));
  if (!a.length || !b.size) return 0;
  return a.filter((w) => b.has(w)).length / a.length;
}

export type KycCheck = "match" | "mismatch" | "missing";

export function compareNumber(typed: string, extracted: string): KycCheck {
  const t = onlyDigits(typed);
  const e = onlyDigits(extracted);
  if (!t || !e) return "missing";
  return t === e ? "match" : "mismatch";
}

export function compareName(typed: string, extracted: string): KycCheck {
  if (!normalizeArabicName(typed) || !normalizeArabicName(extracted)) return "missing";
  return nameMatchScore(typed, extracted) >= 0.67 ? "match" : "mismatch";
}
