// حدود مسماة للقيم المكررة في الكود.

// أقصى طول لمفتاح عميل مجهول (viewerKey/sessionKey/followerKey/recipientKey)
// يُمرَّر من المتصفح للتعرف على الجهاز دون تسجيل دخول.
export const MAX_CLIENT_KEY_LENGTH = 80;

/** قصّ مفتاح عميل إلى الحد المسموح (نفس الصيغة في 12 موقعًا). */
export function truncateClientKey(value: unknown): string {
  return String(value ?? "").slice(0, MAX_CLIENT_KEY_LENGTH);
}
