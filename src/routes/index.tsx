import { ModeSwitch } from "@/components/ModeSwitch";
import { WelcomeGate, ENTRY_KEY } from "@/components/WelcomeGate";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { PulseSplash } from "@/components/PulseSplash";
import { supabase } from "@/integrations/supabase/client";
import { getCachedProfile, type CachedProfile } from "@/lib/user-profile-cache";
import { setVoiceMode } from "@/lib/voice";
import { ArrowLeft, CalendarCheck, HeartPulse, Hospital, Mic, Siren, Search, Sparkles, Stethoscope, UserRound } from "lucide-react";
import { specialties } from "@/lib/mock-data";
import { specialtyIcons } from "@/lib/specialty-icons";
import { PatientAuthModal } from "@/components/PatientAuthModal";
import { getPatientSession } from "@/lib/patient-session";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";

const resumeTargets = {
  patient: { to: "/patient", label: "متابعة البحث عن عيادة" },
  doctor: { to: "/doctor", label: "الانتقال لعيادتك" },
  secretary: { to: "/reception", label: "فتح دفتر الحضور" },
} as const;

function ResumeCard() {
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  useEffect(() => {
    const cached = getCachedProfile();
    if (!cached) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user.id === cached.userId) setProfile(cached);
    });
  }, []);
  if (!profile) return null;
  const t = resumeTargets[profile.role];
  const name = profile.role === "doctor" && !profile.name.startsWith("د") ? `د. ${profile.name}` : profile.name;
  return (
    <Link
      to={t.to}
      className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/40 bg-card p-4 shadow-soft"
    >
      {profile.avatar ? (
        <img src={profile.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="grid h-12 w-12 place-items-center rounded-full gradient-primary text-lg font-bold text-primary-foreground">
          {profile.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">مرحباً بك مجدداً {name}</div>
        <div className="text-sm text-primary">{t.label}</div>
      </div>
      <div className="text-xl text-primary">←</div>
    </Link>
  );
}

export const Route = createFileRoute("/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — سندك الطبي في كل وقت" },
      { name: "description", content: "دليلك الطبي للوصول المباشر لأفضل الأطباء والعيادات في مصر" },
      { property: "og:title", content: "سَنَد — سندك الطبي في كل وقت" },
      { property: "og:description", content: "دليلك الطبي للوصول المباشر لأفضل الأطباء والعيادات في مصر" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});


const services = [
  { to: "/patient/search", label: "العيادات والأطباء", hint: "دوّر على الأقرب ليك", icon: Stethoscope },
  { to: "/hospitals", label: "المستشفيات الحكومية", hint: "136 مستشفى بالاتجاهات", icon: Hospital },
  { to: "/patient/assistant", label: "احكي أعراضك", hint: "نرشّحلك التخصص", icon: Sparkles },
  { to: "/patient", label: "عيادات نشطة الآن", hint: "تحديثات مباشرة", icon: CalendarCheck },
] as const;

function Landing() {
  const navigate = useNavigate();
  const doctorClinicId = useDoctorClinicId();
  useEffect(() => {
    if (doctorClinicId && localStorage.getItem("sanad_app_mode") !== "patient") {
      void navigate({ to: "/doctor", replace: true });
    }
  }, [doctorClinicId, navigate]);
  const tapsRef = useRef<number[]>([]);
  const handleLogoTap = () => {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].filter((t) => now - t < 1200);
    if (tapsRef.current.length >= 3) {
      tapsRef.current = [];
      navigate({ to: "/admin-access" });
    }
  };
  const [authOpen, setAuthOpen] = useState(false);
  const openPatient = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session || getPatientSession()) navigate({ to: "/patient" });
    else setAuthOpen(true);
  };
  const startVoice = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) setVoiceMode(true);
    else navigate({ to: "/patient/login" });
  };
  const topSpecialties = specialties.slice(0, 8);
  const [gate, setGate] = useState<"loading" | "show" | "hide">("loading");
  const [splashDone, setSplashDone] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem("sanad_splash_seen")) setSplashDone(true); } catch { /* ignore */ }
  }, []);
  const finishSplash = useCallback(() => {
    try { sessionStorage.setItem("sanad_splash_seen", "1"); } catch { /* ignore */ }
    setSplashDone(true);
  }, []);
  useEffect(() => {
    let choice: string | null = null;
    try { choice = localStorage.getItem(ENTRY_KEY); } catch { /* ignore */ }
    supabase.auth.getSession().then(({ data }) => {
      setGate(data.session || getPatientSession() || choice === "guest" ? "hide" : "show");
    });
  }, []);
  if (!splashDone) return <PulseSplash onDone={finishSplash} />;
  if (gate === "loading") return <div className="min-h-screen bg-background" />;
  if (gate === "show") return <WelcomeGate onGuest={() => setGate("hide")} />;
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-24 pt-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogoTap}
              aria-label="سَنَد"
              className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft select-none"
            >
              <HeartPulse className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">سَنَد <span className="sr-only">— دليلك للعيادات والأطباء في مصر</span></h1>
              <p className="text-[11px] text-muted-foreground">سندك الطبي في كل وقت</p>
            </div>
          </div>
          <div className="flex items-center gap-2"><ModeSwitch current="patient" compact />
          <button
            type="button"
            onClick={openPatient}
            aria-label="حسابي"
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-primary shadow-soft transition active:scale-95"
          >
            <UserRound className="h-5 w-5" />
          </button></div>
        </header>

        <section className="mt-6 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-soft">
          <h2 className="text-2xl font-extrabold leading-snug">محتاج دكتور؟<br />خلّينا نوصّلك للأنسب.</h2>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-card p-1.5 text-foreground">
            <Link to="/patient/search" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2.5 text-sm text-muted-foreground">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <span className="truncate">طبيب، تخصص أو مستشفى...</span>
            </Link>
            <button
              type="button"
              onClick={startVoice}
              aria-label="تحدث مع المساعد الصوتي"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition active:scale-95"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
        </section>

        <ResumeCard />

        <Link
          to="/patient/emergency"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-destructive p-4 text-destructive-foreground shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive-foreground/15">
            <Siren className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-extrabold">طوارئ؟</span>
            <span className="block text-xs opacity-90">إسعاف 123 وأقرب مستشفى ليك</span>
          </span>
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <h3 className="mt-7 mb-3 text-base font-extrabold">الخدمات</h3>
        <div className="grid grid-cols-2 gap-3">
          {services.map(({ to, label, hint, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition active:scale-[0.98]">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-extrabold">{label}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-7 mb-3 flex items-center justify-between">
          <h3 className="text-base font-extrabold">أشهر التخصصات</h3>
          <Link to="/patient/search" className="text-xs font-bold text-primary">الكل ←</Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {topSpecialties.map((s) => (
            <Link key={s.id} to="/patient/search" className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition active:scale-95">
              {(() => { const I = specialtyIcons[s.id] ?? Stethoscope; return <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><I className="h-5 w-5" /></span>; })()}
              <span className="truncate text-[11px] font-bold w-full">{s.name}</span>
            </Link>
          ))}
        </div>

        <Link
          to="/doctor/login"
          className="mt-7 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 transition active:scale-[0.99]"
        >
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">أنت طبيب أو عيادة؟</span>
            <span className="block text-xs text-muted-foreground">سجّل عيادتك ووصّل لمرضى أكتر</span>
          </span>
          <ArrowLeft className="h-4 w-4 text-primary" />
        </Link>
        <Link to="/reception" className="mt-2 block text-center text-xs font-bold text-muted-foreground underline">
          دخول سكرتير العيادة
        </Link>

        {authOpen && (
          <PatientAuthModal
            onClose={() => setAuthOpen(false)}
            onDone={() => { setAuthOpen(false); navigate({ to: "/patient", replace: true }); }}
          />
        )}

        <footer className="mt-8 space-y-2 border-t border-border pt-4 text-center">
          <div className="space-x-3">
            <Link to="/privacy" className="text-xs font-bold text-primary underline">
              سياسة الخصوصية
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link to="/developer" className="text-xs font-bold text-muted-foreground underline" dir="ltr">
              About the Developer
            </Link>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">SANAD {APP_VERSION_LABEL}</p>
        </footer>
      </div>
    </div>
  );
}
