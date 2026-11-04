import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/components/StaffAuth";
import { checkPassword } from "@/lib/password-policy";
import { PasswordStrength } from "./PasswordStrength";

/** Signed-in password change. Requires the current password, then revokes all other sessions. */
export function ChangePasswordCard() {
  const [email, setEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setEmail(u?.email ?? null);
      setHasPassword(!!u?.identities?.some((i) => i.provider === "email"));
    });
  }, []);

  if (!email) return null;

  const sendSetLink = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setMsg(error ? { ok: false, text: authErrorMessage(error.message) } : { ok: true, text: "بعتنا رابط آمن على بريدك لتعيين كلمة سر." });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const c = checkPassword(next, [email]);
    if (!c.ok) return setMsg({ ok: false, text: c.error! });
    if (next !== confirm) return setMsg({ ok: false, text: "كلمتا السر غير متطابقتين." });
    if (next === current) return setMsg({ ok: false, text: "اختار كلمة سر مختلفة عن الحالية." });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as never);
    if (error) {
      setBusy(false);
      return setMsg({ ok: false, text: authErrorMessage(error.message) });
    }
    await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setOpen(false);
    setMsg({ ok: true, text: "اتغيرت كلمة السر، وتم تسجيل خروج أي جهاز تاني." });
  };

  const input = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary";

  return (
    <div className="rounded-3xl tile-3d border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-extrabold">كلمة السر</p>
          <p className="text-[11px] text-muted-foreground">{hasPassword ? "غيّرها بأمان" : "حسابك بجوجل — تقدر تضيف كلمة سر"}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => (hasPassword ? setOpen((o) => !o) : sendSetLink())}
          className="min-h-11 rounded-xl bg-primary px-3 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {hasPassword ? (open ? "إلغاء" : "تغيير") : "إرسال رابط"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-xs font-bold text-muted-foreground">
            كلمة السر الحالية
            <input type={show ? "text" : "password"} dir="ltr" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            كلمة السر الجديدة
            <input type={show ? "text" : "password"} dir="ltr" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} className={input} />
            <PasswordStrength value={next} context={[email]} />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            تأكيد كلمة السر
            <input type={show ? "text" : "password"} dir="ltr" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          </label>
          <button type="button" onClick={() => setShow((s) => !s)} className="flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {show ? "إخفاء" : "إظهار"}
          </button>
          <button type="submit" disabled={busy} className="btn-3d flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
          </button>
        </form>
      )}

      {msg && (
        <p className={`mt-3 flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-bold ${msg.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {msg.ok && <ShieldCheck className="h-4 w-4" />} {msg.text}
        </p>
      )}
    </div>
  );
}
