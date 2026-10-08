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

const services = [
  {
    to: "/patient/search",
    title: "أبحث عن عيادة",
    desc: "أقرب العيادات على الخريطة بالأسعار والتقييمات",
    icon: Search,
  },
  {
    to: "/patient",
    title: "حجز موعد",
    desc: "اختار العيادة واحجز دورك واستلم كود الحجز",
    icon: CalendarCheck,
  },
] as const;

const wideService = {
  to: "/patient/assistant",
  title: "استشارة سريعة",
  desc: "اكتب أو تحدث عن الأعراض والمساعد يرشّح لك التخصص والأنسب قريباً",
  icon: Mic,
} as const;

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

function ServiceCard({
  to,
  title,
  desc,
  icon: Icon,
  className = "",
}: {
  to: string;
  title: string;
  desc: string;
  icon: typeof Search;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition hover:border-primary/40 active:scale-[0.99] ${className}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 text-base font-extrabold">{title}</span>
      <span className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</span>
    </Link>
  );
}

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
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-24 pt-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogoTap}
            aria-label="سَنَد"
            className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft select-none"
          >
            <HeartPulse className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold">سَنَد <span className="sr-only">— دليلك للعيادات والأطباء في مصر</span></h1>
            <p className="text-sm text-muted-foreground">سندك الطبي في كل وقت</p>
          </div>
        </div>

        {/* Top banner — voice assistant prompt */}
        <div className="mt-6 rounded-3xl gradient-primary p-5 text-primary-foreground shadow-soft">
          <h2 className="text-xl font-extrabold">المساعد الصوتي الذكي 🎙️</h2>
          <p className="mt-2 text-sm leading-6 opacity-90">
            تحدث مع سَنَد مباشرة بصوتك للحصول على الاستشارة فورااً
          </p>
          <button
            type="button"
            onClick={async () => {
              const { data } = await supabase.auth.getSession();
              if (data.session) {
                setVoiceMode(true);
              } else {
                navigate({ to: "/patient/login" });
              }
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-foreground px-4 py-3 text-base font-extrabold text-primary shadow-soft transition active:scale-[0.98]"
          >
            <Mic className="h-5 w-5" />
            ابدأ المحادثة الصوتية
          </button>
        </div>

        <ResumeCard />

        {/* Emergency — prominent full-width alert */}
        <Link
          to="/patient/emergency"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-destructive p-4 text-destructive-foreground shadow-soft transition active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-destructive-foreground/15">
            <Siren className="h-6 w-6 animate-pulse" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold">طوارئ سَنَد</span>
            <span className="block text-sm opacity-90">وصول فوري للإسعاف</span>
          </span>
          <span className="text-xl">←</span>
        </Link>

        {/* Quick services — 2-column grid */}
        <section className="mt-6">
          <h2 className="text-base font-extrabold">خدمات سَنَد السريعة</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {services.map((s) => (
              <ServiceCard key={s.to} to={s.to} title={s.title} desc={s.desc} icon={s.icon} />
            ))}
            <ServiceCard
              to={wideService.to}
              title={wideService.title}
              desc={wideService.desc}
              icon={wideService.icon}
              className="col-span-2 flex-row items-center gap-3"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            تصفح واكتشف العيادات بدون الحاجة لتسجيل حساب
          </p>
        </section>

        {/* Clinic accounts */}
        <section className="mt-6">
          <h2 className="text-base font-extrabold">حسابات العيادات</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {clinicAccounts.map((a) => (
              <ServiceCard key={a.to} to={a.to} title={a.title} desc={a.desc} icon={a.icon} />
            ))}
          </div>
        </section>

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
