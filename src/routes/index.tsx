import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Stethoscope, UserRound, ClipboardList, HeartPulse, Siren } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCachedProfile, type CachedProfile } from "@/lib/user-profile-cache";

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
      className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/40 bg-card p-4 shadow-soft"
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

const roles = [
  { to: "/patient", title: "أبحث عن عيادة", desc: "اعثر على أقرب عيادة وتواصل مباشرة", icon: UserRound, tone: "gradient-primary text-primary-foreground" },
  { to: "/reception", title: "سكرتير عيادة", desc: "دفتر حضور المرضى وتنظيم العيادة", icon: ClipboardList, tone: "bg-card text-foreground" },
  { to: "/doctor", title: "طبيب / عيادة", desc: "بروفايل العيادة والروشتات والتواصل مع المرضى", icon: Stethoscope, tone: "bg-card text-foreground" },
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
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 py-10">
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

        <div className="mt-8 rounded-3xl gradient-primary p-6 text-primary-foreground shadow-soft">
          <h2 className="text-xl font-bold">أهلاً بك في سَنَد</h2>
          <p className="mt-2 text-sm leading-6 opacity-90">
            دليلك الطبي للوصول المباشر لأفضل الأطباء والعيادات في مصر
          </p>
        </div>

        <ResumeCard />

        <Link
          to="/patient/emergency"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-destructive p-4 text-lg font-extrabold text-destructive-foreground shadow-soft"
        >
          <Siren className="h-6 w-6 animate-pulse" /> طوارئ سَنَد — وصول فوري للإسعاف
        </Link>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">اختار دورك</p>
          {roles.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className={`flex items-center gap-4 rounded-2xl border border-border p-4 transition hover:shadow-soft ${r.tone}`}
            >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-foreground/20">
                <r.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{r.title}</div>
                <div className={`text-sm ${r.tone.includes("text-primary-foreground") ? "opacity-90" : "text-muted-foreground"}`}>{r.desc}</div>
              </div>
              <div className="text-xl opacity-70">←</div>
            </Link>
          ))}
          <p className="text-center text-xs text-muted-foreground">تصفح واكتشف العيادات بدون الحاجة لتسجيل حساب</p>
        </div>

        <footer className="mt-8 space-y-2 border-t border-border pt-4 text-center">
          <div className="space-x-3">
            <Link to="/terms" className="text-xs font-bold text-primary underline">
              شروط الاستخدام وإخلاء المسؤولية
            </Link>
            <span className="text-xs text-muted-foreground">·</span>
            <Link to="/developer" className="text-xs font-bold text-muted-foreground underline" dir="ltr">
              About the Developer
            </Link>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            سَنَد أداة تقنية لاكتشاف العيادات وتسهيل التواصل المباشر بين المريض والعيادة، ولا تقدم
            استشارات طبية ولا تتحمل المسؤولية عن الخدمات الطبية المقدمة من العيادات.
          </p>
          <p className="text-[10px] font-bold text-muted-foreground" dir="ltr">SANAD {APP_VERSION_LABEL}</p>
        </footer>
      </div>
    </div>
  );
}
