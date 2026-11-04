/** Browser-safe password rules shared by reset + change flows. */
export type PasswordCheck = { ok: boolean; score: 0 | 1 | 2 | 3 | 4; error?: string };

const COMMON = ["12345678", "123456789", "password", "qwerty123", "11111111", "sanad123", "00000000"];

export function checkPassword(pw: string, context: string[] = []): PasswordCheck {
  if (pw.length < 10) return { ok: false, score: 0, error: "كلمة السر لازم تكون ١٠ حروف على الأقل." };
  const lower = pw.toLowerCase();
  if (COMMON.some((c) => lower.includes(c)))
    return { ok: false, score: 0, error: "كلمة السر دي سهلة التخمين، اختار غيرها." };
  for (const c of context) {
    const part = c.toLowerCase().split("@")[0];
    if (part.length >= 4 && lower.includes(part))
      return { ok: false, score: 1, error: "ما تستخدمش اسمك أو بريدك جوه كلمة السر." };
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3)
    return { ok: false, score: 1, error: "استخدم ٣ أنواع على الأقل: حروف صغيرة، كبيرة، أرقام، رموز." };
  const score = (pw.length >= 14 && classes === 4 ? 4 : classes === 4 || pw.length >= 14 ? 3 : 2) as 2 | 3 | 4;
  return { ok: true, score };
}

export const STRENGTH_LABELS = ["ضعيفة جدًا", "ضعيفة", "مقبولة", "قوية", "قوية جدًا"];
