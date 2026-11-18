export function authErrorMessage(raw?: string) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("check_email"))
    return "لو البريد ده جديد، بعتنالك رسالة تفعيل — افتح بريدك واضغط الرابط وبعدين سجّل دخولك.";
  if (msg.includes("invalid login")) return "البريد أو كلمة السر غير صحيحة.";
  if (msg.includes("email not confirmed")) return "الحساب غير مفعّل بعد، تواصل مع إدارة سند.";
  if (msg.includes("email_taken") || msg.includes("already"))
    return "البريد مستخدم بالفعل، جرّب تسجيل الدخول.";
  if (msg.includes("weak_password") || msg.includes("pwned") || msg.includes("weak"))
    return "كلمة السر ضعيفة أو منتشرة — اختار كلمة أقوى (٨ حروف وأرقام ورموز مختلفة).";
  if (msg.includes("invalid_email")) return "البريد الإلكتروني غير صحيح.";
  if (msg.includes("invalid_license"))
    return "رقم ترخيص مزاولة المهنة غير صحيح — لازم أرقام (٤ أرقام على الأقل).";
  if (msg.includes("invalid_syndicate"))
    return "رقم القيد بنقابة الأطباء غير صحيح — لازم أرقام (٣ أرقام على الأقل).";
  if (msg.includes("rate") || msg.includes("429")) return "محاولات كثيرة، استنى شوية وحاول تاني.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "تعذر الاتصال بالشبكة، حاول مرة أخرى.";
  return "حدث خطأ غير متوقع، حاول مرة أخرى.";
}
