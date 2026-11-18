// التحقق من بيانات تسجيل حساب طبيب جديد — مشترك بين صفحة دخول الطبيب
// (doctor.login.tsx) وإعدادات العيادة (use-doctor-settings.ts).
// الرسائل والترتيب متطابقان في الموقعين؛ تنسيق رقم الهاتف يبقى عند كل
// مستدعٍ لأنه يختلف بينهما، وهذا المُحقّق يعيد الأرقام المنظّفة فقط.
export type DoctorSignupValues = {
  name: string;
  phone: string;
  email: string;
  pass: string;
  medicalLicense: string;
  syndicateNo: string;
};

export function validateDoctorSignup(values: DoctorSignupValues): {
  error?: string;
  licenseDigits: string;
  syndicateDigits: string;
} {
  if (!values.name.trim())
    return { error: "من فضلك اكتب اسم الطبيب", licenseDigits: "", syndicateDigits: "" };
  if (!values.phone.trim())
    return {
      error: "من فضلك اكتب رقم الموبايل / الواتساب",
      licenseDigits: "",
      syndicateDigits: "",
    };
  if (!values.email.trim())
    return { error: "من فضلك اكتب البريد الإلكتروني", licenseDigits: "", syndicateDigits: "" };
  if (values.pass.length < 8)
    return {
      error: "كلمة السر لازم تكون ٨ حروف أو أرقام على الأقل",
      licenseDigits: "",
      syndicateDigits: "",
    };
  const licenseDigits = values.medicalLicense.replace(/\D/g, "");
  const syndicateDigits = values.syndicateNo.replace(/\D/g, "");
  if (licenseDigits.length < 4)
    return {
      error: "من فضلك اكتب رقم ترخيص مزاولة المهنة (٤ أرقام على الأقل)",
      licenseDigits,
      syndicateDigits,
    };
  if (syndicateDigits.length < 3)
    return {
      error: "من فضلك اكتب رقم القيد بنقابة الأطباء (٣ أرقام على الأقل)",
      licenseDigits,
      syndicateDigits,
    };
  return { licenseDigits, syndicateDigits };
}
