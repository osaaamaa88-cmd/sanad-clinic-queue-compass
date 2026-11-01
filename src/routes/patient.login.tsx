import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  Apple,
  ArrowLeft,
  FlaskConical,
  LogOut,
  MessagesSquare,
  Pill,
  ScanLine,
  Settings,
  UserRound,
} from "lucide-react";
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
import { safePatientReturnPath } from "@/lib/patient-auth-return";

export const Route = createFileRoute("/patient/login")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: safePatientReturnPath(search.returnTo),
  }),
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "حسابي — سند" },
      { name: "description", content: "حساب المريض وأدوات متابعة الصحة ومواعيد الأدوية في سند." },
      { property: "og:title", content: "حسابي — سند" },
      {
        property: "og:description",
        content: "حساب المريض وأدوات متابعة الصحة ومواعيد الأدوية في سند.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientLogin,
});

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
      <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
            <UserRound className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold">حسابك في سند</h2>
            <p className="text-xs text-muted-foreground">
              حجوزاتك ومؤشراتك الصحية محفوظة مع حسابك على الجهاز.
            </p>
          </div>
        </div>
        {patient ? (
          <p className="text-sm">
            مسجل الدخول باسم <b>{patient.name}</b>{" "}
            {patient.phone && <span dir="ltr">({patient.phone})</span>}
          </p>
        ) : (
          <PatientAuthForm onDone={() => navigate({ to: "/patient", replace: true })} />
        )}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <Link
            to="/developer"
            className="flex min-h-11 items-center text-xs font-bold text-muted-foreground underline"
          >
            عن المطوّر
          </Link>
          <p className="text-xs text-muted-foreground" dir="ltr">
            SANAD {APP_VERSION_LABEL}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-extrabold">صحتي</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/patient/health"
            className="group min-h-32 min-w-0 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
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
            className="group min-h-32 min-w-0 rounded-2xl border border-warning/30 bg-warning/10 p-4 transition hover:-translate-y-0.5 hover:shadow-soft"
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
            className="min-h-32 min-w-0 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Apple className="h-5 w-5" />
            </span>
            <span className="mt-3 block text-sm font-extrabold">التغذية والسعرات</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              صوّر أكلك واعرف سعراته وتابع يومك
            </span>
          </Link>
          <Link
            to="/patient/lab-reader"
            className="min-h-32 min-w-0 rounded-2xl border border-primary/30 bg-primary-soft/30 p-4 transition hover:shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical className="h-5 w-5" />
            </span>
            <span className="mt-3 block text-sm font-extrabold">قارئ التحاليل</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              افهم نتيجة تحليلك
            </span>
          </Link>
          <Link
            to="/patient/drug-scan"
            className="min-h-32 min-w-0 rounded-2xl border border-warning/30 bg-warning/10 p-4 transition hover:shadow-soft"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-warning text-warning-foreground">
              <ScanLine className="h-5 w-5" />
            </span>
            <span className="mt-3 block text-sm font-extrabold">ماسح الأدوية</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              بدائل الدواء الناقص
            </span>
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-extrabold">الرسائل</h2>
        <Link
          to="/messages"
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 transition hover:shadow-soft"
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

      <section className="mb-6">
        <h2 className="mb-3 text-base font-extrabold">الإعدادات</h2>
        <Link
          to="/settings"
          className="flex min-h-20 items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 transition hover:shadow-soft"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Settings className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">إعدادات التطبيق</span>
            <span className="block text-xs text-muted-foreground">
              المساعد والصوت والمظهر ووضع الطبيب
            </span>
          </span>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </Link>
      </section>

      {patient && (
        <Button
          variant="outline"
          onClick={logout}
          className="min-h-11 w-full rounded-2xl py-3 text-sm font-bold"
        >
          <LogOut className="h-4 w-4" /> تسجيل الخروج
        </Button>
      )}
    </AppShell>
  );
}
