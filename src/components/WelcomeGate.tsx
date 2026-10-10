import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Compass, HeartPulse, Stethoscope, UserRound } from "lucide-react";

export const ENTRY_KEY = "sanad_entry_choice";

export function WelcomeGate({ onGuest }: { onGuest: () => void }) {
  const navigate = useNavigate();
  const choose = (v: string) => {
    try { localStorage.setItem(ENTRY_KEY, v); } catch { /* ignore */ }
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-3xl gradient-primary text-primary-foreground shadow-soft">
            <HeartPulse className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">سَنَد</h1>
          <p className="mt-1 text-sm text-muted-foreground">سندك الطبي في كل وقت — اختار طريقة الدخول</p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => { choose("patient"); navigate({ to: "/patient/login" }); }}
            className="flex w-full items-center gap-4 rounded-2xl border border-primary/40 bg-card p-4 text-start shadow-soft transition active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><UserRound className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">مستخدم (مريض)</span>
              <span className="block text-xs text-muted-foreground">سجّل دخول أو اعمل حساب لحفظ بياناتك وأدويتك</span>
            </span>
            <ArrowLeft className="h-5 w-5 text-primary" />
          </button>

          <button
            type="button"
            onClick={() => { choose("guest"); onGuest(); }}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-start transition active:scale-[0.98]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><Compass className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">دخول كزائر</span>
              <span className="block text-xs text-muted-foreground">تصفّح العيادات والمستشفيات والطوارئ بدون تسجيل</span>
            </span>
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />للأطباء وفريق العيادة<span className="h-px flex-1 bg-border" />
        </div>

        <Link
          to="/doctor/login"
          onClick={() => choose("doctor")}
          className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-card p-4 text-start text-foreground shadow-soft transition active:scale-[0.98]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground"><Stethoscope className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-foreground">طبيب أو فريق العيادة</span>
            <span className="block text-xs text-muted-foreground">طبيب • سكرتير • استقبال — الحجز، الطابور والروشتة</span>
          </span>
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Link>

        <p className="mt-auto pt-8 text-center text-[11px] text-muted-foreground">
          بالمتابعة أنت موافق على <Link to="/terms" className="underline">الشروط</Link> و<Link to="/privacy" className="underline">الخصوصية</Link>
        </p>
      </div>
    </div>
  );
}
