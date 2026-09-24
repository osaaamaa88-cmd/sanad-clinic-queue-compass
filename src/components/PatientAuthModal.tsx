import { useState } from "react";
import { X, Loader2, UserRound, Phone as PhoneIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { savePatientSession, type PatientSession } from "@/lib/patient-session";

type Props = {
  onDone: (s: PatientSession) => void;
  onClose: () => void;
};

/** Lightweight sign-in sheet shown only when the patient tries to book. */
export function PatientAuthModal({ onDone, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const digits = phone.replace(/\D/g, "");
  const valid = name.trim().length >= 3 && digits.length >= 10;

  const submit = () => {
    if (!valid) {
      setErr("اكتب اسمك الكامل ورقم موبايل صحيح (١١ رقم).");
      return;
    }
    onDone(savePatientSession({ name, phone: digits, via: "guest" }));
  };

  const google = async () => {
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
    if (error) {
      setBusy(false);
      setErr("الدخول بجوجل مش متاح دلوقتي، استخدم الاسم ورقم الموبايل.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold">بياناتك لتأكيد الدور</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              محتاجين الاسم ورقم الموبايل بس — من غير كلمة سر ولا خطوات زيادة.
            </p>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-2 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <UserRound className="h-3.5 w-3.5 text-primary" /> اسمك
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد محمد"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <PhoneIcon className="h-3.5 w-3.5 text-primary" /> رقم الموبايل
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="01xxxxxxxxx"
              dir="ltr"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        {err && <p className="mt-3 text-xs font-bold text-destructive">{err}</p>}

        <button
          onClick={submit}
          className="mt-4 w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft"
        >
          تأكيد ومتابعة الحجز
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-extrabold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
          الدخول بضغطة واحدة بجوجل
        </button>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          بياناتك محفوظة على جهازك فقط لمتابعة دورك وإشعاراتك.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.4-.2-2H12v3.8h6.2c-.1 1-.8 2.6-2.4 3.6l-.1.1 3.5 2.7.2.1c2.2-2 3.6-5 3.6-8.3" />
      <path fill="#34A853" d="M12 23.5c3.2 0 5.8-1 7.7-2.8l-3.7-2.8c-1 .7-2.3 1.2-4 1.2-3.1 0-5.7-2-6.6-4.8l-.1.1-3.7 2.8v.1C3.5 20.9 7.4 23.5 12 23.5" />
      <path fill="#FBBC05" d="M5.4 14.3c-.3-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3V9.6L1.6 6.8l-.1.1C.7 8.4.3 10.2.3 12s.4 3.6 1.2 5.1z" />
      <path fill="#EA4335" d="M12 5c2.2 0 3.7.9 4.6 1.7l3.3-3.2C17.8 1.6 15.2.5 12 .5 7.4.5 3.5 3.1 1.5 6.9l3.9 3c.9-2.8 3.5-4.9 6.6-4.9" />
    </svg>
  );
}
