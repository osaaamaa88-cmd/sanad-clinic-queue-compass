/** كارت سند الطبي: بيانات مضغوطة داخل QR، تُقرأ بدون إنترنت ولا تُرسل لأي خادم. */
export type HealthPass = {
  name: string;
  phone?: string;
  bloodType?: string;
  allergies?: string;
  chronic?: string;
  contactName?: string;
  contactPhone?: string;
  /** وقت الإصدار (ms) */
  issuedAt: number;
};

export const PASS_PREFIX = "SANAD1:";
/** صلاحية الكارت: 30 يومًا ثم يُطلب تحديثه */
export const PASS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const clip = (s: string | undefined, n: number) => (s ?? "").trim().slice(0, n) || undefined;

function toB64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeHealthPass(p: HealthPass): string {
  const compact = {
    n: clip(p.name, 60),
    p: clip(p.phone, 20),
    b: clip(p.bloodType, 4),
    a: clip(p.allergies, 160),
    c: clip(p.chronic, 160),
    en: clip(p.contactName, 40),
    ep: clip(p.contactPhone, 20),
    t: p.issuedAt,
  };
  return PASS_PREFIX + toB64Url(JSON.stringify(compact));
}

export type DecodeResult =
  | { ok: true; pass: HealthPass; expired: boolean }
  | { ok: false; error: string };

export function decodeHealthPass(text: string, now = Date.now()): DecodeResult {
  if (!text.startsWith(PASS_PREFIX)) return { ok: false, error: "ده مش كارت سند" };
  try {
    const o = JSON.parse(fromB64Url(text.slice(PASS_PREFIX.length)));
    if (typeof o?.n !== "string" || !o.n || typeof o.t !== "number")
      return { ok: false, error: "الكارت ناقص البيانات" };
    const pass: HealthPass = {
      name: o.n, phone: o.p, bloodType: o.b, allergies: o.a, chronic: o.c,
      contactName: o.en, contactPhone: o.ep, issuedAt: o.t,
    };
    return { ok: true, pass, expired: now - o.t > PASS_TTL_MS };
  } catch {
    return { ok: false, error: "تعذر قراءة الكارت" };
  }
}
