import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { DoctorSignupFields } from "./DoctorSignupFields";

export function DoctorSignupForm({
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
  creating,
  onSubmit,
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
  creating: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="rounded-2xl border border-primary bg-primary-soft p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-xs font-bold leading-relaxed text-primary">
            ٥ بيانات بس وحسابك يبقى جاهز. تقدر تكمّل باقي بيانات بروفايلك بعد الدخول للوحة التحكم.
          </p>
        </div>
      </div>

      <DoctorSignupFields
        name={name}
        setName={setName}
        spec={spec}
        setSpec={setSpec}
        phone={phone}
        setPhone={setPhone}
        email={email}
        setEmail={setEmail}
        pass={pass}
        setPass={setPass}
        medicalLicense={medicalLicense}
        setMedicalLicense={setMedicalLicense}
        syndicateNo={syndicateNo}
        setSyndicateNo={setSyndicateNo}
        signupError={signupError}
      />

      <button
        onClick={onSubmit}
        disabled={creating}
        className="mt-5 w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-60"
      >
        {creating ? "جاري الإنشاء…" : "إنشاء حساب العيادة الآن"}
      </button>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        بتسجيلك أنت موافق على{" "}
        <Link to="/terms" className="font-bold text-primary underline">
          شروط الاستخدام وإخلاء المسؤولية
        </Link>
        . سند أداة تنظيم مواعيد فقط ولا تقدم استشارات طبية.
      </p>
    </>
  );
}
