import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeartPulse, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PatientAuthForm } from "@/components/PatientAuthModal";
import { supabase } from "@/integrations/supabase/client";
import { clearPatientSession, syncPatientSessionFromAuth, type PatientSession } from "@/lib/patient-session";

export const Route = createFileRoute("/patient/login")({
  head: () => ({
    meta: [
      { title: "دخول المريض — سَنَد" },
      { name: "description", content: "سجل دخولك في سَنَد بضغطة واحدة بجوجل أو بالاسم ورقم الموبايل." },
      { property: "og:title", content: "دخول المريض — سَنَد" },
      { property: "og:description", content: "سجل دخولك في سَنَد بضغطة واحدة بجوجل أو بالاسم ورقم الموبايل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientLogin,
});

function PatientLogin() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientSession | null>(null);

  useEffect(() => {
    void syncPatientSessionFromAuth().then(setPatient);
  }, []);

  const logout = async () => {
    clearPatientSession();
    await supabase.auth.signOut();
    setPatient(null);
  };

  return (
    <AppShell title="دخول المريض" subtitle="سَنَد | SANAD" backTo="/patient">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-2 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground">
            <HeartPulse className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">أهلاً بك في سَنَد</h2>
            <p className="text-xs text-muted-foreground">حجوزاتك ومؤشراتك الصحية محفوظة مع حسابك على الجهاز.</p>
          </div>
        </div>
        {patient ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm">مسجل الدخول باسم <b>{patient.name}</b> {patient.phone && <span dir="ltr">({patient.phone})</span>}</p>
            <button onClick={() => navigate({ to: "/patient" })} className="w-full rounded-2xl gradient-primary py-3 font-extrabold text-primary-foreground">
              الذهاب للرئيسية
            </button>
            <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold">
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </div>
        ) : (
          <PatientAuthForm onDone={() => navigate({ to: "/patient" })} />
        )}
      </div>
    </AppShell>
  );
}
