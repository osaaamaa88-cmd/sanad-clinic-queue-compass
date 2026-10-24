import { ModeSwitch } from "@/components/ModeSwitch";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, FlaskConical, HeartPulse, LogOut, Mic, Pill } from "lucide-react";
import { isVoiceModeOn, setVoiceMode } from "@/lib/voice";
import { MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PatientAuthForm } from "@/components/PatientAuthModal";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPatientSession,
  getPatientSession,
  syncPatientSessionFromAuth,
  type PatientSession,
} from "@/lib/patient-session";
import { clearAllLocalUserData } from "@/lib/user-profile-cache";
import { Button } from "@/components/ui/button";
import { SoundToggle, ThemeSetting } from "@/components/SoundControls";
import { safePatientReturnPath } from "@/lib/patient-auth-return";

export const Route = createFileRoute("/patient/login")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: safePatientReturnPath(search.returnTo),
  }),
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "حسابي — سَنَد" },
      { name: "description", content: "حساب المريض وأدوات متابعة الصحة ومواعيد الأدوية في سَنَد." },
      { property: "og:title", content: "حسابي — سَنَد" },
      {
        property: "og:description",
        content: "حساب المريض وأدوات متابعة الصحة ومواعيد الأدوية في سَنَد.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientLogin,
});

function VoiceModeToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isVoiceModeOn());
    sync();
    window.addEventListener("sanad:voice-mode", sync);
    return () => window.removeEventListener("sanad:voice-mode", sync);
  }, []);
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <span className="flex items-center gap-3">
        <Mic className="h-5 w-5 text-primary" />
        <span>
          <span className="block text-sm font-extrabold">المساعد الصوتي</span>
          <span className="block text-xs text-muted-foreground">
            لكبار السن وفاقدي البصر — يظهر فوق كل الصفحات
          </span>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={on}
        onChange={() => setVoiceMode(!on)}
        className="h-6 w-11 accent-primary"
      />
    </label>
  );
}

function PatientLogin() {
  const navigate = useNavigate();
  const { returnTo } = Route.useSearch();
  const [patient, setPatient] = useState<PatientSession | null>(null);

  useEffect(() => {
    // Instant: show locally saved profile, then revalidate silently.
    setPatient(getPatientSession());
    let active = true;
    let googleSignInHandled = false;
    const finishGoogleSignIn = (syncedPatient?: PatientSession | null) => {
      if (googleSignInHandled) return;
      googleSignInHandled = true;

      const completeSignIn = (profile: PatientSession | null) => {
        if (!active || !profile) return;
        setPatient(profile);
        void navigate({ to: returnTo ?? "/patient", replace: true });
      };

      if (syncedPatient) {
        completeSignIn(syncedPatient);
        return;
      }

      window.setTimeout(() => {
        void syncPatientSessionFromAuth()
          .then(completeSignIn)
          .catch((error: unknown) => {
            console.error("[PatientLogin] Failed to sync Google patient session", error);
          });
      }, 0);
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || session?.user.app_metadata.provider !== "google") return;
      finishGoogleSignIn();
    });
    void syncPatientSessionFromAuth()
      .then((syncedPatient) => {
        if (!active || !syncedPatient) return;
        setPatient(syncedPatient);
        if (syncedPatient.via === "google" && syncedPatient.userId) {
          finishGoogleSignIn(syncedPatient);
        }
      })
      .catch((error: unknown) => {
        console.error("[PatientLogin] Failed to load patient session", error);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate, returnTo]);

  const logout = async () => {
    clearPatientSession();
    clearAllLocalUserData();
    await supabase.auth.signOut();
    setPatient(null);
    navigate({ to: "/patient/login", replace: true });
  };

  return (
    <AppShell title="حسابي" subtitle="بياناتك وأدواتك الصحية" backTo="/patient">
      <section className="mb-4 grid grid-cols-2 gap-3">
        <Link
          to="/patient/health"
          className="group min-w-0 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span className="mt-3 flex items-center justify-between gap-2">
            <span className="min-w-0 text-sm font-extrabold">مؤشرات الصحة</span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-primary" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            الضغط والسكر والحاسبات الصحية
          </span>
        </Link>
        <Link
          to="/patient/meds"
          className="group min-w-0 rounded-2xl border border-warning/30 bg-warning/10 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning text-warning-foreground">
            <Pill className="h-5 w-5" />
          </span>
          <span className="mt-3 flex items-center justify-between gap-2">
            <span className="min-w-0 text-sm font-extrabold">مواعيد الأدوية</span>
            <ArrowLeft className="h-4 w-4 shrink-0 text-warning" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            جرعاتك وتنبيهات مواعيد الدواء
          </span>
        </Link>
        <Link
          to="/nutrition"
          className="col-span-2 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">التغذية والسعرات</span>
            <span className="block text-xs text-muted-foreground">
              صوّر أكلك واعرف سعراته وتابع يومك
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </Link>
        <Link
          to="/patient/drug-scan"
          className="flex flex-col rounded-2xl border border-warning/30 bg-warning/10 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning text-warning-foreground">
            <Pill className="h-5 w-5" />
          </span>
          <span className="mt-3 text-sm font-extrabold">ماسح الأدوية</span>
          <span className="mt-1 text-xs leading-5 text-muted-foreground">بدائل الدواء الناقص</span>
        </Link>
        <Link
          to="/patient/lab-reader"
          className="flex flex-col rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <FlaskConical className="h-5 w-5" />
          </span>
          <span className="mt-3 text-sm font-extrabold">قارئ التحاليل</span>
          <span className="mt-1 text-xs leading-5 text-muted-foreground">افهم نتيجة تحليلك</span>
        </Link>
        <Link
          to="/messages"
          className="col-span-2 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-success text-success-foreground">
            <MessagesSquare className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">رسايلي مع العيادات</span>
            <span className="block text-xs text-muted-foreground">
              محادثاتك المباشرة مع الدكاترة
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 text-success" />
        </Link>
        <Link
          to="/settings"
          className="col-span-2 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            🎤
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">المساعد الصوتي والإعدادات</span>
            <span className="block text-xs text-muted-foreground">لكبار السن وفاقدي البصر</span>
          </span>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </Link>
      </section>
      <div className="mb-4 space-y-3">
        <ModeSwitch current="patient" />
        <VoiceModeToggle />
        <SoundToggle />
        <ThemeSetting />
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground">
            <HeartPulse className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">أهلاً بك في سَنَد</h2>
            <p className="text-xs text-muted-foreground">
              حجوزاتك ومؤشراتك الصحية محفوظة مع حسابك على الجهاز.
            </p>
          </div>
        </div>
        {patient ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">
              مسجل الدخول باسم <b>{patient.name}</b>{" "}
              {patient.phone && <span dir="ltr">({patient.phone})</span>}
            </p>
            <Button
              onClick={() => navigate({ to: "/patient" })}
              className="w-full rounded-2xl gradient-primary py-3 font-extrabold text-primary-foreground"
            >
              الذهاب للرئيسية
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </Button>
          </div>
        ) : (
          <PatientAuthForm onDone={() => navigate({ to: "/patient", replace: true })} />
        )}
        <div className="mt-4 border-t border-border pt-3 text-center">
          <Link
            to="/developer"
            className="text-[11px] font-bold text-muted-foreground underline"
            dir="ltr"
          >
            About the Developer
          </Link>
          <p className="mt-1 text-[10px] text-muted-foreground" dir="ltr">
            SANAD {APP_VERSION_LABEL}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
