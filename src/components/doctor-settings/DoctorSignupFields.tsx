import { Lock } from "lucide-react";
import { Field } from "./Field";
import { SpecialtyChips } from "./SpecialtyChips";

// بطاقة حقول تسجيل حساب طبيب جديد — مشتركة بين صفحة دخول الطبيب
// (doctor.login.tsx) ونموذج التسجيل في الإعدادات (DoctorSignupForm).
// البانر والشروط وزر الإرسال يبقيان عند كل مستدعٍ لأن نصوصهما مختلفة.
export function DoctorSignupFields({
  name,
  setName,
  spec,
  setSpec,
  phone,
  setPhone,
  email,
  setEmail,
  pass,
  setPass,
  medicalLicense,
  setMedicalLicense,
  syndicateNo,
  setSyndicateNo,
  signupError,
  licenseNoteClassName = "text-xs leading-relaxed text-muted-foreground",
}: {
  name: string;
  setName: (value: string) => void;
  spec: string;
  setSpec: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  pass: string;
  setPass: (value: string) => void;
  medicalLicense: string;
  setMedicalLicense: (value: string) => void;
  syndicateNo: string;
  setSyndicateNo: (value: string) => void;
  signupError: string;
  licenseNoteClassName?: string;
}) {
  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4">
      <Field label="اسم الطبيب *" value={name} onChange={setName} placeholder="د. الاسم الكامل" />
      <div>
        <label className="text-xs font-bold text-muted-foreground">التخصص *</label>
        <SpecialtyChips spec={spec} setSpec={setSpec} />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">رقم الموبايل / الواتساب *</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="01xxxxxxxxx"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">البريد الإلكتروني *</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          dir="ltr"
          placeholder="doctor@email.com"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> كلمة السر *
        </label>
        <input
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          type="password"
          dir="ltr"
          placeholder="٨ حروف أو أرقام على الأقل"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-muted-foreground">
            رقم ترخيص مزاولة المهنة *
          </label>
          <input
            value={medicalLicense}
            onChange={(e) => setMedicalLicense(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            dir="ltr"
            placeholder="أرقام فقط"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-foreground">
            رقم القيد بنقابة الأطباء *
          </label>
          <input
            value={syndicateNo}
            onChange={(e) => setSyndicateNo(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            dir="ltr"
            placeholder="أرقام فقط"
            className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base font-bold outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="rounded-xl bg-secondary p-3">
        <p className={licenseNoteClassName}>
          بعد تفعيل الحساب، ارفع مستند الترخيص من إعدادات العيادة ليتمكن فريق التوثيق من مراجعته
          بأمان.
        </p>
      </div>
      {signupError && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
          {signupError}
        </p>
      )}
    </div>
  );
}
