import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit.functions";

export function authErrorMessage(raw?: string) {
  const msg = (raw || "").toLowerCase();
  if (msg.includes("invalid login")) return "البريد أو كلمة السر غير صحيحة.";
  if (msg.includes("email not confirmed")) return "الحساب غير مفعّل بعد، تواصل مع إدارة سَنَد.";
  if (msg.includes("email_taken") || msg.includes("already")) return "البريد مستخدم بالفعل، جرّب تسجيل الدخول.";
  if (msg.includes("weak_password")) return "كلمة السر قصيرة — لازم ٦ حروف/أرقام على الأقل.";
  if (msg.includes("invalid_email")) return "البريد الإلكتروني غير صحيح.";
  if (msg.includes("rate") || msg.includes("429")) return "محاولات كثيرة، استنى شوية وحاول تاني.";
  if (msg.includes("failed to fetch") || msg.includes("network")) return "تعذر الاتصال بالشبكة، حاول مرة أخرى.";
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
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
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
      {footer}
    </form>
  );
}
