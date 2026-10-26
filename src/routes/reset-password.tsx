import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/components/StaffAuth";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "تعيين كلمة سر جديدة | سند" },
      { name: "description", content: "تعيين كلمة سر جديدة لحسابات أطباء وطاقم سند." },
      { property: "og:title", content: "تعيين كلمة سر جديدة | سند" },
      { property: "og:description", content: "استعادة حساب الطبيب في سند بأمان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("كلمة السر لازم تكون ٨ حروف على الأقل.");
    if (password !== confirm) return setError("كلمتا السر غير متطابقتين.");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(authErrorMessage(err.message));
    setDone(true);
    setTimeout(() => navigate({ to: "/doctor", replace: true }), 1500);
  };

  const input =
    "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary";

  return (
    <main dir="rtl" className="mx-auto min-h-screen max-w-md px-4 py-10">
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h1 className="text-base font-extrabold">تعيين كلمة سر جديدة</h1>
        </div>
        {done ? (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-bold text-success">
            تم تغيير كلمة السر بنجاح ✅ جاري تحويلك...
          </p>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">
            افتح هذه الصفحة من الرابط اللي وصلك على البريد. لو الرابط انتهى، اطلب رابط جديد من صفحة
            الدخول.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground">كلمة السر الجديدة</label>
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">تأكيد كلمة السر</label>
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={input}
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
              className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-extrabold text-primary-foreground shadow-soft disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} حفظ كلمة السر
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
