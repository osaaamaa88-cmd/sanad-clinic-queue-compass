import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit.functions";

export function authErrorMessage(raw?: string) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("check_email"))
    return "لو البريد ده جديد، بعتنالك رسالة تفعيل — افتح بريدك واضغط الرابط وبعدين سجّل دخولك.";
  if (msg.includes("invalid login")) return "البريد أو كلمة السر غير صحيحة.";
  if (msg.includes("email not confirmed")) return "الحساب غير مفعّل بعد، تواصل مع إدارة سَنَد.";
  if (msg.includes("email_taken") || msg.includes("already"))
    return "البريد مستخدم بالفعل، جرّب تسجيل الدخول.";
  if (msg.includes("weak_password") || msg.includes("pwned") || msg.includes("weak"))
    return "كلمة السر ضعيفة أو منتشرة — اختار كلمة أقوى (٨ حروف وأرقام ورموز مختلفة).";
  if (msg.includes("invalid_email")) return "البريد الإلكتروني غير صحيح.";
  if (msg.includes("rate") || msg.includes("429")) return "محاولات كثيرة، استنى شوية وحاول تاني.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "تعذر الاتصال بالشبكة، حاول مرة أخرى.";
  return "حدث خطأ غير متوقع، حاول مرة أخرى.";
}

/** Shared email + password sign-in card for doctors and secretaries. */
export function StaffAuth({
  title = "تسجيل دخول",
  hint,
  onSignedIn,
  footer,
}: {
  title?: string;
  hint?: string;
  onSignedIn: () => void;
  footer?: React.ReactNode;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const forgot = async () => {
    setError("");
    setInfo("");
    const addr = email.trim().toLowerCase();
    if (!addr) {
      setError("اكتب بريدك الإلكتروني الأول، وبعدين اضغط نسيت كلمة السر.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(addr, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    setInfo("لو البريد مسجل عندنا، هيوصلك رابط لتغيير كلمة السر خلال دقايق.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("اكتب البريد وكلمة السر.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err.message));
      return;
    }
    onSignedIn();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
    >
      <div>
        <p className="text-base font-extrabold">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">البريد الإلكتروني</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          placeholder="doctor@email.com"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground">كلمة السر</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          placeholder="••••••"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
        />
      </div>
      {error && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-center text-[12px] font-bold text-destructive">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-white shadow-soft disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} دخول
      </button>
      <button
        type="button"
        onClick={forgot}
        disabled={busy}
        className="w-full text-center text-xs font-bold text-primary underline-offset-2 hover:underline"
      >
        نسيت كلمة السر؟
      </button>
      {info && (
        <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-[12px] font-bold text-success">
          {info}
        </p>
      )}
      {footer}
    </form>
  );
}
