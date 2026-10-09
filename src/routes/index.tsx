import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedProfile, type CachedProfile } from "@/lib/user-profile-cache";
import { setVoiceMode } from "@/lib/voice";
import { CalendarCheck, ClipboardList, HeartPulse, Mic, Siren, Search, Stethoscope } from "lucide-react";

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

const clinicAccounts = [
  {
    to: "/doctor",
    title: "طبيب / عيادة",
    desc: "بروفايل العيادة والروشتات والمرضى",
    icon: Stethoscope,
  },
  {
    to: "/reception",
    title: "سكرتير عيادة",
    desc: "دفتر حضور المرضى وتنظيم اليوم",
    icon: ClipboardList,
  },
] as const;

const quickActions = [
  { to: "/patient/search", label: "عيادات ومستشفيات", icon: Search },
  { to: "/patient", label: "حجز موعد", icon: CalendarCheck },
  { to: "/patient/assistant", label: "استشارة ذكية", icon: Stethoscope },
] as const;

function Landing() {
  const navigate = useNavigate();
  const tapsRef = useRef<number[]>([]);
  const handleLogoTap = () => {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current, now].filter((t) => now - t < 1200);
    if (tapsRef.current.length >= 3) {
      tapsRef.current = [];
      navigate({ to: "/admin-access" });
    }
  };
  const startVoice = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) setVoiceMode(true);
    else navigate({ to: "/patient/login" });
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-24 pt-8">
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
            <h1 className="text-xl font-extrabold">سَنَد <span className="sr-only">— دليلك للعيادات والأطباء في مصر</span></h1>
            <p className="text-xs text-muted-foreground">سندك الطبي في كل وقت</p>
          </div>
        </div>

        <h2 className="mt-8 text-2xl font-extrabold leading-snug">محتاج دكتور؟<br />خلّينا نوصّلك للأنسب.</h2>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
          <Link to="/patient/search" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">ابحث عن طبيب، تخصص أو مستشفى</span>
          </Link>
          <button
            type="button"
            onClick={startVoice}
            aria-label="تحدث مع المساعد الصوتي"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground transition active:scale-95"
          >
            <Mic className="h-5 w-5" />
          </button>
        </div>

        <ResumeCard />

        <div className="mt-6 grid grid-cols-3 gap-3">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center shadow-soft transition active:scale-[0.98]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold leading-4">{label}</span>
            </Link>
          ))}
        </div>

        <Link
          to="/patient/emergency"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground">
            <Siren className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-destructive">طوارئ</span>
            <span className="block text-xs text-muted-foreground">إسعاف 123 وأقرب مستشفى</span>
          </span>
          <span className="text-destructive">←</span>
        </Link>

        <div className="mt-8 rounded-2xl bg-muted/50 p-4">
          <p className="text-sm font-bold">أنت طبيب أو تدير عيادة؟</p>
          <div className="mt-2 flex gap-4 text-xs font-bold text-primary">
            {clinicAccounts.map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center gap-1">
                <a.icon className="h-4 w-4" /> {a.title} ←
              </Link>
            ))}
          </div>
        </div>

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
