/** Single shared crisis-line constants for self-harm support across UI and local replies. */

/** Mental-health crisis / psychological support line (Egypt) — 24/7. */
export const PSYCH_SUPPORT_LINE = "16328";

/** Immediate physical-danger ambulance line. */
export const AMBULANCE_LINE = "123";

/** Ministry of Health mental-health portal (Arabic). */
export const MENTAL_HEALTH_PORTAL_URL =
  "https://mentalhealth.mohp.gov.eg/mental/web/ar";

/** Warm local reply shown/said when self-harm intent is detected. Includes both lines. */
export const SELF_HARM_LOCAL_REPLY =
  `أنا واقف جنبك ومش لوحدك في الحاجة دي. كلم شخصاً تثق به (شخص قريب منك) دلوقتي وخليه يفضل معاك. ` +
  `لو حسّيت بخطر مباشر عليك، اتصل بالإسعاف ${AMBULANCE_LINE} فوراً. ` +
  `ولو محتاج حد يسمعك بهدوء، في خط الدعم النفسي من وزارة الصحة ${PSYCH_SUPPORT_LINE} شغال ٢٤ ساعة.`;
