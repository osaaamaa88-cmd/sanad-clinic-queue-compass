import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Loader2, UserRound, Phone as PhoneIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { savePatientSession, type PatientSession } from "@/lib/patient-session";

type Props = {
  onDone: (s: PatientSession) => void;
  onClose: () => void;
  title?: string;
};

/** Sign-in sheet shown when a guest tries an action that needs their identity. */
export function PatientAuthModal({ onDone, onClose, title }: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-in slide-in-from-bottom-10 fade-in duration-300 rounded-t-3xl border border-border bg-card p-5 shadow-soft sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-extrabold leading-7">
            {title ?? "سجل دخولك أو أنشئ حسابك للتفاعل واستخدام كافة المميزات 🚀"}
          </h3>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full p-2 text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <PatientAuthForm onDone={onDone} />
      </div>
    </div>
  );
}

export function PatientAuthForm({ onDone }: { onDone: (s: PatientSession) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const digits = phone.replace(/\D/g, "");
  const valid = name.trim().length >= 3 && /^01\d{9}$/.test(digits);

  const submit = () => {
    if (!valid) {
      setErr("اكتب اسمك الكامل ورقم موبايل مصري صحيح (١١ رقم يبدأ بـ 01).");
      return;
    }
    onDone(savePatientSession({ name, phone: digits, via: "guest" }));
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/patient/login`,
        },
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
      }
    } catch (error) {
      console.error("[PatientAuth] Google sign-in failed", error);
      setBusy(false);
      setErr(
        error instanceof Error
          ? error.message
          : "تعذر بدء تسجيل الدخول بحساب Google. حاول مرة أخرى أو استخدم تسجيل الدخول بالاسم ورقم الهاتف.",
      );
    }
  };

  return (
    <>
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-secondary p-1 text-sm font-extrabold">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl py-2 transition ${mode === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}
          >
            {m === "login" ? "تسجيل الدخول" : "حساب جديد"}
          </button>
        ))}
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
        className="mt-4 w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-primary-foreground shadow-soft"
      >
        {mode === "login" ? "دخول ومتابعة" : "إنشاء الحساب ومتابعة"}
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> أو <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={() => void signInWithGoogle()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3.5 text-sm font-extrabold disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        المتابعة بحساب Google
      </button>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-4 block w-full text-center text-xs font-bold text-primary underline"
      >
        {mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "عندك حساب؟ سجل دخولك"}
      </button>

      <Link
        to="/terms"
        className="mt-3 block text-center text-[11px] font-bold text-muted-foreground underline"
      >
        إخلاء المسؤولية الطبية وشروط الاستخدام
      </Link>
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23 12.2c0-.8-.1-1.4-.2-2H12v3.8h6.2c-.1 1-.8 2.6-2.4 3.6l-.1.1 3.5 2.7.2.1c2.2-2 3.6-5 3.6-8.3"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.2 0 5.8-1 7.7-2.8l-3.7-2.8c-1 .7-2.3 1.2-4 1.2-3.1 0-5.7-2-6.6-4.8l-.1.1-3.7 2.8v.1C3.5 20.9 7.4 23.5 12 23.5"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3c-.3-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3V9.6L1.6 6.8l-.1.1C.7 8.4.3 10.2.3 12s.4 3.6 1.2 5.1z"
      />
      <path
        fill="#EA4335"
        d="M12 5c2.2 0 3.7.9 4.6 1.7l3.3-3.2C17.8 1.6 15.2.5 12 .5 7.4.5 3.5 3.1 1.5 6.9l3.9 3c.9-2.8 3.5-4.9 6.6-4.9"
      />
    </svg>
  );
}
