import { defaultDoctorAvatar } from "@/lib/default-avatars";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  ClipboardList,
  Clock,
  Droplets,
  Globe2,
  HeartPulse,
  Hospital,
  MapPin,
  MessageCircleHeart,
  Search,
  Sparkles,
  Star,
  Siren,
  Wind,
  X,
} from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { AppShell } from "@/components/AppShell";
import { QueueTrackerCard } from "@/components/QueueTrackerCard";
import { HealthActivityCarousel } from "@/components/HealthActivityCarousel";
import { QuickBookingDrawer } from "@/components/booking/QuickBookingDrawer";
import hologramFigure from "@/assets/hologram-figure.png";
import { specialties, type Clinic } from "@/lib/mock-data";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";
const StoryViewer = lazy(() =>
  import("@/components/StoryViewer").then((m) => ({ default: m.StoryViewer })),
);
import { useQueryClient } from "@tanstack/react-query";
import { clinicsQuery } from "@/lib/directory-queries";
import { getClinicProfileExtras, type ClinicProfileExtras } from "@/lib/clinic-profile";
import { getClinicStories, type StoryItem } from "@/lib/stories";
import { Button } from "@/components/ui/button";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { getPatientSession, getSavedBookings } from "@/lib/patient-session";
import { getCachedProfile } from "@/lib/user-profile-cache";
import { bpStatus, parseReadings, READINGS_KEY, sugarStatus } from "@/lib/organ-insights";
import {
  defaultLocation,
  distanceKm,
  getPatientLocation,
  savePatientLocation,
  type PatientLocation,
} from "@/lib/patient-location";

// ===== شبكة الخدمات السريعة: تعريف ثابت خارج المكوّن لتجنّب إعادة الإنشاء =====
const quickActions = [
  {
    to: "/patient/search",
    label: "حجز عيادة",
    hint: "دوّر على أقرب طبيب",
    icon: CalendarPlus,
    tone: "bg-primary-soft text-primary",
    badge: undefined,
  },
  {
    to: "/patient/assistant",
    label: "اسأل نيمو",
    hint: "مساعدك الذكي 24 ساعة",
    icon: MessageCircleHeart,
    tone: "bg-success/15 text-success",
    badge: "نبض ذكي",
  },
  {
    to: "/patient/emergency",
    label: "طوارئ 123",
    hint: "مساعدة فورية الآن",
    icon: Siren,
    tone: "bg-destructive/10 text-destructive",
    badge: undefined,
  },
  {
    to: "/patient/meds",
    label: "الروشتة والتحاليل",
    hint: "فحص علاجك وتحاليلك",
    icon: ClipboardList,
    tone: "bg-warning/15 text-warning",
    badge: undefined,
  },
] as const;

export const Route = createFileRoute("/patient/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سند — الصفحة الرئيسية للمريض" },
      {
        name: "description",
        content:
          "دوّر على طبيب من التخصصات القريبة منك في مصر، شوف العيادات على الخريطة وتواصل معاها بسهولة على سند.",
      },
      { property: "og:title", content: "سند — سندك الطبي في كل وقت" },
      {
        property: "og:description",
        content: "اكتشف العيادات القريبة وتابع تحديثاتها واحجز دورك بسهولة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientHome,
});

function PatientHome() {
  const doctorClinicId = useDoctorClinicId();
  const goDoctor = useNavigate();
  useEffect(() => {
    if (doctorClinicId) void goDoctor({ to: "/doctor", replace: true });
  }, [doctorClinicId, goDoctor]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoaded, setClinicsLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, ClinicProfileExtras>>({});
  const [stories, setStories] = useState<Record<string, StoryItem[]>>({});
  const [viewer, setViewer] = useState<{ clinic: Clinic; items: StoryItem[] } | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);
  const [location, setLocation] = useState<PatientLocation>(defaultLocation);
  const [locOpen, setLocOpen] = useState(false);
  const [patientName, setPatientName] = useState<string>("");
  const [patientAvatar, setPatientAvatar] = useState<string | undefined>();
  const [healthSnapshot, setHealthSnapshot] = useState(() =>
    typeof window === "undefined" ? {} : parseReadings(window.localStorage.getItem(READINGS_KEY)),
  );
  const [selectedClinicForBooking, setSelectedClinicForBooking] = useState<Clinic | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [hydration, setHydration] = useState(0);
  const queryClient = useQueryClient();
  useEffect(() => {
    setLocation(getPatientLocation());
    setPatientName(getPatientSession()?.name?.trim() || "");
    setPatientAvatar(getCachedProfile()?.avatar);
    const refreshReadings = () =>
      setHealthSnapshot(parseReadings(window.localStorage.getItem(READINGS_KEY)));
    window.addEventListener("focus", refreshReadings);
    window.addEventListener("storage", refreshReadings);
    return () => {
      window.removeEventListener("focus", refreshReadings);
      window.removeEventListener("storage", refreshReadings);
    };
  }, []);

  // تحية حسب توقيت اليوم (صباحاً / مساءً)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "طاب يومك";
    return "مساء الخير";
  }, []);

  useEffect(() => {
    let cancelled = false;
    queryClient.fetchQuery(clinicsQuery).then(async (list) => {
      if (cancelled) return;
      setClinics(list);
      setClinicsLoaded(true);
      const visible = list.slice(0, 10);
      const results = await Promise.all(
        visible.map(async (clinic) => {
          const [profile, storySet] = await Promise.all([
            getClinicProfileExtras(clinic.id),
            getClinicStories(clinic.id),
          ]);
          return { id: clinic.id, profile, items: storySet.stories };
        }),
      );
      if (cancelled) return;
      setProfiles(Object.fromEntries(results.map((result) => [result.id, result.profile])));
      setStories(Object.fromEntries(results.map((result) => [result.id, result.items])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => clinics.filter((clinic) => clinic.availableNow).slice(0, 10),
    [clinics],
  );
  const availableCounts = useMemo(
    () =>
      clinics.reduce<Record<string, number>>((counts, clinic) => {
        if (clinic.availableNow) counts[clinic.specialtyId] = (counts[clinic.specialtyId] ?? 0) + 1;
        return counts;
      }, {}),
    [clinics],
  );
  const selectedSpecialtyData = specialties.find((item) => item.id === selectedSpecialty);
  // أقرب حجز قادم على هذا الجهاز — لعرض رقم الدور في كارت البطل
  const upcomingBooking = useMemo(() => {
    const bookings = getSavedBookings().filter((b) => (b.queueNumber ?? 0) > 0);
    return bookings[0] ?? null;
  }, []);

  const handleOpenQuickBooking = useCallback((clinic: Clinic) => {
    setSelectedClinicForBooking(clinic);
    setBookingDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (!breathingActive) return;
    setBreathPhase("inhale");
    const phases: Array<"inhale" | "hold" | "exhale"> = ["inhale", "hold", "exhale"];
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % phases.length;
      setBreathPhase(phases[index]);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [breathingActive]);

  const recommended = useMemo(
    () =>
      clinics
        .map((clinic) =>
          typeof clinic.lat === "number" && typeof clinic.lng === "number"
            ? {
                ...clinic,
                distanceKm:
                  Math.round(distanceKm(location, { lat: clinic.lat, lng: clinic.lng }) * 10) / 10,
              }
            : clinic,
        )
        .filter((clinic) => !clinic.isDemo)
        .filter((clinic) => !selectedSpecialty || clinic.specialtyId === selectedSpecialty)
        .sort((a, b) => a.distanceKm - b.distanceKm || b.rating - a.rating)
        .slice(0, selectedSpecialty ? undefined : 6),
    [clinics, selectedSpecialty, location],
  );

  return (
    <AppShell
      title="سند | SANAD"
      tone="light"
      right={
        <>
          <ThemeToggle />
          <NotificationsBell audience="patient" />
        </>
      }
      wide
      hideBack
      centeredTitle
      headerClassName="backdrop-blur-md bg-background/80 border-b border-border/50"
      contentClassName="content-bottom-fade pb-32"
    >
      {/* ===== كارت البطل المتوهج (Hero Aurora Status Card) =====
        الصورة الرمزية + الاسم أعلى الكارت، وكبسولة الموقع جهة اليسار */}
      <section className="aurora-medical-card rounded-3xl p-5 mb-5">
        {/* توهجات أورورا خلفية */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-14 -left-8 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-success/10 blur-3xl"
        />
        <div className="relative">
          {/* صف علوي مرن: الصورة الرمزية والاسم يميناً، الموقع يساراً */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-lg font-extrabold text-primary shadow-soft"
              >
                {patientAvatar ? (
                  <img src={patientAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (patientName || "ز").slice(0, 1)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold">
                  {patientName ? patientName.split(" ")[0] : "يا بطل"}
                  </p>
                <p className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                </p>
              </div>
            </div>
            {/* كبسولة الموقع الجغرافي السائلة */}
            <button
              type="button"
              onClick={() => setLocOpen(true)}
              className="btn-liquid-glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-right"
              aria-label="تغيير الموقع الجغرافي"
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="max-w-[8rem] truncate text-xs font-bold">{location.city}</span>
              <span className="text-[10px] text-muted-foreground">▾</span>
            </button>
          </div>

          <p className="mt-3 text-lg font-black leading-7">
            {greeting} <span className="text-muted-foreground">تابع صحتك مع سند</span>
          </p>

          <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
              <HeartPulse className="h-5 w-5 shrink-0 text-primary" />
              {healthSnapshot.bp || healthSnapshot.sugar ? (
                <div className="min-w-0 flex-1 text-xs font-bold text-muted-foreground">
                  <p>
                    الضغط:{" "}
                    {healthSnapshot.bp
                      ? { normal: "طبيعي", watch: "تابعه", alert: "تنبيه", unknown: "غير معروف" }[
                          bpStatus(healthSnapshot.bp)
                        ]
                      : "لا توجد قراءة"}
                </p>
                  <p>
                    السكر:{" "}
                    {healthSnapshot.sugar
                      ? { normal: "طبيعي", watch: "تابعه", alert: "تنبيه", unknown: "غير معروف" }[
                          sugarStatus(healthSnapshot.sugar)
                        ]
                      : "لا توجد قراءة"}
                  </p>
                </div>
              ) : (
                <p className="min-w-0 flex-1 text-xs font-bold text-muted-foreground">
                  لا توجد قراءات مسجلة
                </p>
              )}
              <Link
                to="/patient/health"
                className="flex min-h-11 shrink-0 items-center text-xs font-extrabold text-primary"
              >
                {healthSnapshot.bp || healthSnapshot.sugar ? "التفاصيل ←" : "سجّل أول قراءة"}
              </Link>
          </div>

          {/* الزرّان الزجاجيان العريضان */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/patient/assistant"
              className="btn-liquid-primary flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-xs font-extrabold"
            >
              <MessageCircleHeart className="h-4 w-4" />
              اسأل نيمو بصوتك
            </Link>
            <Link
              to="/patient/search"
              className="btn-liquid-glass flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-xs font-extrabold"
            >
              <Search className="h-4 w-4 text-primary" />
              احجز عيادة أو دكتور
            </Link>
          </div>
        </div>
      </section>
      {upcomingBooking && <QueueTrackerCard />}
      <HealthActivityCarousel />
      {/* ===== العناية اليومية (Daily Calm & Wellness) ===== */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">تمرين التنفس مع نيمو</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {breathingActive
                  ? breathPhase === "inhale"
                    ? "شهيق هادئ..."
                    : breathPhase === "hold"
                      ? "احبس النفس..."
                      : "زفير واسترخاء"
                  : "4 ثوانٍ • تهدئة ضربات القلب"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBreathingActive((v) => !v)}
              className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground transition active:scale-95"
            >
              {breathingActive ? "إيقاف" : "ابدأ"}
            </button>
          </div>
          <div className="mt-4 grid place-items-center">
            <span
              className={`grid h-24 w-24 place-items-center rounded-full border-4 border-primary/30 bg-primary/10 text-primary transition-all duration-[4000ms] ease-in-out ${
                breathingActive
                  ? breathPhase === "exhale"
                    ? "scale-100"
                    : "scale-125"
                  : "scale-100"
              }`}
            >
              <Wind className="h-8 w-8" />
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">متتبع شرب الماء</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {hydration}/8 أكواب • {Math.round((hydration / 8) * 100)}%
              </p>
            </div>
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-3 grid grid-cols-8 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setHydration(i + 1)}
                className={`grid aspect-square place-items-center rounded-full border transition active:scale-95 ${
                  i < hydration
                    ? "border-primary/40 bg-primary/20 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground"
                }`}
                aria-label={`كوب ${i + 1}`}
              >
                <Droplets className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHydration(0)}
            className="mt-3 text-[11px] font-bold text-muted-foreground transition hover:text-primary"
          >
            إعادة تعيين
          </button>
        </div>
      </section>
      {/* ===== شبكة بينتو الطبية الذكية (Medical Bento Grid) =====
        كارت هولوجرام طولي (row-span-2) + طوارئ + MedScan */}
      <section aria-label="الخدمات الطبية" className="mb-6 grid grid-cols-2 gap-3">
        {/* الكارت الطولي الأيمن — مجسم الهولوجرام والملف الطبي الذكي */}
        <Link
          to="/patient/health"
          className="glass-liquid spotlight-card group relative col-start-1 row-span-2 flex flex-col justify-between overflow-visible rounded-3xl p-4 text-right transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
            event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
          }}
        >
          {/* المجسم المضيء مع خط ليزر ممسوح */}
          <div className="relative mx-auto grid h-36 w-20 place-items-center overflow-hidden">
            <img
              src={hologramFigure}
              alt=""
              aria-hidden
              className="h-full w-auto object-contain drop-shadow-[0_0_14px_var(--color-primary)]"
            />
            <span aria-hidden="true" className="holo-laser" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-base font-extrabold leading-6">
              ملفك الطبي الذكي
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
            </p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              نقطة نبض حية لآخر قراءات الضغط والسكر — اضغط على أي عضو
            </p>
            <span className="mt-2 inline-block rounded-full bg-primary-soft px-3 py-1 text-[11px] font-extrabold text-primary">
              فتح الملف ←
            </span>
          </div>
        </Link>

        {/* الكارت العلوي الأيسر — طوارئ 123 الإسعافية */}
        <Link
          to="/patient/emergency"
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-right shadow-soft backdrop-blur-xl transition hover:border-destructive active:scale-[0.97]"
        >
          <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <span className="absolute inset-0 animate-ping rounded-xl bg-destructive/20" />
            <Siren className="relative h-5 w-5" />
          </span>
          <span className="mt-2">
            <span className="block text-[13px] font-extrabold text-destructive">طوارئ 123</span>
            <span className="block text-[10px] font-medium text-muted-foreground">
              اتصال إسعاف فوري بلمسة
            </span>
          </span>
        </Link>

        {/* الكارت السفلي الأيسر — فحص الروشتة والتحاليل MedScan */}
        <Link
          to="/patient/meds"
          className="glass-liquid flex flex-col justify-between overflow-hidden rounded-2xl p-3.5 text-right shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/15 text-success">
            <ClipboardList className="h-5 w-5" />
          </span>
          <span className="mt-2">
            <span className="block text-[13px] font-extrabold">روشتة وتحاليل</span>
            <span className="block text-[10px] font-medium text-muted-foreground">
              فحص MedScan الذكي بلمسة
            </span>
          </span>
        </Link>
      </section>

      {/* ===== كارت المتابعة الصحية والمجسم أُدمج في شبكة البينتو أعلاه ===== */}
      {locOpen && (
        <LocationPickerModal
          current={location}
          onClose={() => setLocOpen(false)}
          onSelect={(l) => {
            savePatientLocation(l);
            setLocation(l);
            setLocOpen(false);
          }}
        />
      )}

      <Link
        to="/patient/search"
        className="mt-4 flex items-center gap-3 rounded-full border border-border/50 bg-card/80 px-4 py-3.5 shadow-soft backdrop-blur-xl transition-all duration-200 active:scale-[0.97] hover:border-primary/50"
      >
        <Search className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">
          دور على طبيب، تخصص أو عيادة…
        </span>
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">عيادات نشطة الآن</h2>
            <p className="text-xs text-muted-foreground">اضغط لمشاهدة آخر تحديثات العيادة</p>
          </div>
          <span className="shrink-0 text-xs font-bold text-success">● مباشر</span>
        </div>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {active.map((clinic) => {
            const profile = profiles[clinic.id];
            const clinicStories = stories[clinic.id] ?? [];
            return (
              <button
                key={clinic.id}
                type="button"
                onClick={() =>
                  clinicStories.length ? setViewer({ clinic, items: clinicStories }) : undefined
                }
                className="group w-[78px] shrink-0 snap-start text-center transition active:scale-95"
                aria-label={`مشاهدة تحديثات ${clinic.doctor}`}
              >
                <span
                  className={`mx-auto block h-[68px] w-[68px] rounded-full p-[3px] ${clinicStories.length ? "gradient-story" : "bg-border"}`}
                >
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-background bg-card text-2xl">
                    <img src={profile?.avatarUrl || defaultDoctorAvatar(clinic.doctor)} alt={clinic.doctor} className="h-full w-full object-cover" />
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-xs font-bold group-hover:text-primary">
                  {clinic.doctor.replace(/^د\.?\s*/, "د. ")}
                </span>
                {clinic.isDemo && (
                  <span className="mt-1 block text-xs font-bold text-warning">
                    بيانات تجريبية
                  </span>
                )}
              </button>
            );
          })}
          {active.length === 0 && (
            <p className="w-full rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              لا توجد عيادات نشطة الآن
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">اختار التخصص</h2>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => setSpecialtiesOpen(true)}
            className="h-auto p-0 text-xs font-bold"
          >
            شوف الكل
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {specialties.slice(0, 8).map((specialty, index) => {
            const SpecialtyIcon = specialtyIcons[specialty.id] ?? Hospital;
            const isSelected = selectedSpecialty === specialty.id;
            return (
              <Button
                key={specialty.id}
                type="button"
                variant="ghost"
                onClick={() => setSelectedSpecialty(specialty.id)}
                aria-pressed={isSelected}
                className={`group min-h-20 min-w-0 items-start justify-start gap-3 whitespace-normal rounded-xl border bg-card p-3 text-right transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-card hover:shadow-soft active:scale-[0.97] ${isSelected ? "border-primary shadow-soft ring-1 ring-primary/50" : "border-border hover:border-primary/50"}`}
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${index % 4 === 0 ? "bg-primary-soft text-primary" : index % 4 === 1 ? "bg-warning/15 text-warning" : index % 4 === 2 ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
                >
                  <SpecialtyIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold leading-5 break-words group-hover:text-primary sm:text-sm">
                    {specialty.name}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-medium leading-4 text-muted-foreground">
                    {availableCounts[specialty.id] ?? 0} عيادة مفتوحة
                  </span>
                </span>
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSpecialtiesOpen(true)}
            className="group h-auto min-w-0 justify-start gap-3 whitespace-normal rounded-xl border border-primary/35 bg-card p-3 text-right transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-card hover:shadow-soft active:scale-[0.97]"
          >
            <span className="grid h-11 w-11 shrink-0 animate-pulse place-items-center rounded-xl bg-primary-soft text-primary">
              <Globe2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold group-hover:text-primary">كل التخصصات</span>
              <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                {specialties.length} تخصص
              </span>
            </span>
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">
              {selectedSpecialtyData
                ? `عيادات ${selectedSpecialtyData.name}`
                : "أبرز العيادات القريبة منك"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedSpecialtyData
                ? `${recommended.length} عيادة متاحة في هذا التخصص`
                : "الأعلى تقييماً والأقرب لموقعك"}
            </p>
          </div>
          <Link to="/patient/search" className="shrink-0 text-xs font-bold text-primary">
            المزيد
          </Link>
        </div>
        {selectedSpecialtyData && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/35 bg-primary-soft/30 px-3 py-2">
            <span className="min-w-0 truncate text-xs font-bold text-primary">
              الفلتر: {selectedSpecialtyData.emoji} {selectedSpecialtyData.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSpecialty(null)}
              className="h-7 shrink-0 px-2 text-xs text-primary"
            >
              <X className="h-3.5 w-3.5" />
              إلغاء
            </Button>
          </div>
        )}
        {!clinicsLoaded ? (
          <div
            className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-busy="true"
            aria-label="جاري تحميل العيادات"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="shimmer h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-4 w-2/3 rounded-md" />
                    <div className="shimmer h-3 w-1/2 rounded-md" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="shimmer h-8 flex-1 rounded-full" />
                  <div className="shimmer h-8 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : recommended.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-border bg-card p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Hospital className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold">
              {selectedSpecialtyData
                ? `لا توجد عيادات ${selectedSpecialtyData.name} متاحة حالياً`
                : "لسه ما فيش عيادات موثّقة"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedSpecialtyData
                ? "جرّب تخصصاً آخر أو ألغِ الفلتر."
                : "العيادات هتظهر هنا بعد توثيقها."}
            </p>
          </div>
        ) : (
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-none snap-x">
            {recommended.map((clinic) => (
              <ClinicCapsule key={clinic.id} clinic={clinic} profile={profiles[clinic.id]} onQuickBook={handleOpenQuickBooking} />
            ))}
          </div>
        )}
      </section>

      {specialtiesOpen && (
        <AllSpecialtiesSheet
          counts={availableCounts}
          selected={selectedSpecialty}
          onSelect={setSelectedSpecialty}
          onClose={() => setSpecialtiesOpen(false)}
        />
      )}
      {viewer && (
        <Suspense fallback={null}>
          <StoryViewer
            items={viewer.items}
            title={viewer.clinic.doctor}
            onClose={() => setViewer(null)}
          />
        </Suspense>
      )}
      <QuickBookingDrawer
        clinic={selectedClinicForBooking}
        isOpen={bookingDrawerOpen}
        onOpenChange={setBookingDrawerOpen}
      />
    </AppShell>
  );
}

const specialtyTabs = [
  { id: "popular", label: "الشائعة 🔥" },
  { id: "surgical", label: "جراحية 🩺" },
  { id: "family", label: "أطفال ونساء 👶" },
  { id: "therapy", label: "علاجات وحركة 🦴" },
] as const;

function AllSpecialtiesSheet({
  counts,
  selected,
  onSelect,
  onClose,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof specialtyTabs)[number]["id"]>("popular");
  const [closing, setClosing] = useState(false);
  const visibleSpecialties = specialties.filter((specialty) => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? specialty.name.toLowerCase().includes(normalizedQuery)
      : specialty.category === tab;
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  function requestClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  }

  function chooseSpecialty(id: string) {
    onSelect(id);
    requestClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specialties-title"
    >
      <button
        type="button"
        aria-label="إغلاق التخصصات"
        onClick={requestClose}
        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      />
      <section
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-border bg-card shadow-gold ${closing ? "animate-sheet-down" : "animate-sheet-up"}`}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 pb-4 pt-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="specialties-title" className="text-lg font-extrabold">
              كل التخصصات الطبية
            </h2>
            <p className="text-xs text-muted-foreground">اختار التخصص المناسب ليظهر أطباؤه فوراً</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={requestClose}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(88vh-78px)] overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن تخصص…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </label>
          <div
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="فئات التخصصات"
          >
            {specialtyTabs.map((item) => (
              <Button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                variant={tab === item.id ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setTab(item.id);
                  setQuery("");
                }}
                className="shrink-0 rounded-full"
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleSpecialties.map((specialty) => {
              const SpecialtyIcon = specialtyIcons[specialty.id] ?? Hospital;
              const isSelected = selected === specialty.id;
              return (
                <Button
                  key={specialty.id}
                  type="button"
                  variant="ghost"
                  onClick={() => chooseSpecialty(specialty.id)}
                  className={`min-h-20 min-w-0 items-start justify-start gap-3 whitespace-normal rounded-xl border p-3 text-right transition active:scale-[0.97] ${isSelected ? "border-primary bg-primary-soft/30 shadow-soft" : "border-border bg-background hover:border-primary/50 hover:bg-background"}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <SpecialtyIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold leading-5 break-words sm:text-sm">
                      {specialty.name}
                    </span>
                    <span className="block text-[10px] leading-4 text-muted-foreground">
                      {counts[specialty.id] ?? 0} عيادة مفتوحة
                    </span>
                  </span>
                </Button>
              );
            })}
            {visibleSpecialties.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                لا يوجد تخصص بهذا الاسم
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ClinicCard({ clinic, profile, onQuickBook }: { clinic: Clinic; profile?: ClinicProfileExtras; onQuickBook?: (clinic: Clinic) => void }) {
  const specialty = specialties.find((item) => item.id === clinic.specialtyId);
  const rating = profile?.reviewsCount ? profile.ratingAvg : clinic.rating;
  return (
    <article className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft transition duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
      <Link to="/patient/clinic/$id" params={{ id: clinic.id }} className="block">
        <div className="relative aspect-[16/7] bg-primary-soft">
          {profile?.coverUrl || clinic.coverUrl ? (
            <img
              src={profile?.coverUrl || clinic.coverUrl}
              loading="lazy"
              alt={`عيادة ${clinic.doctor}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <ClinicPlaceholder cover />
          )}
          {clinic.availableNow && (
            <span className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-1 text-[10px] font-extrabold text-success-foreground">
              متاح الآن
            </span>
          )}
          {clinic.isDemo && (
            <span className="absolute left-3 top-3 rounded-full border border-warning/40 bg-card/95 px-2.5 py-1 text-[10px] font-extrabold text-warning">
              بيانات تجريبية
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-start gap-3 p-4 pb-3">
          <span className="-mt-9 grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-card bg-primary-soft text-primary">
            <img src={profile?.avatarUrl || defaultDoctorAvatar(clinic.doctor)} alt={clinic.doctor} className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-extrabold">{clinic.doctor}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {specialty?.name} • {clinic.area}
            </span>
          </span>
          <span className="shrink-0 text-left">
            <span className="flex items-center gap-0.5" aria-label={`التقييم ${rating || 0} من 5`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3.5 w-3.5 text-warning ${rating >= star - 0.5 ? "fill-warning" : "fill-transparent"}`}
                />
              ))}
            </span>
            <span className="mt-1 block text-xs font-bold">
              {rating ? rating.toFixed(1) : "جديد"}
            </span>
          </span>
        </div>
      </Link>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-bold text-foreground">{clinic.price} ج</span>
            <span> • </span>
            <Clock className="inline h-3.5 w-3.5" /> <span>حوالي {clinic.waitingCount * 10} د</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-primary">
            <MapPin className="h-3.5 w-3.5" />
            <span>{clinic.distanceKm.toFixed(1)} كم</span>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="gradient-primary px-5 font-extrabold text-primary-foreground shadow-soft transition hover:scale-[1.03]"
        >
          <Link to="/patient/clinic/$id" params={{ id: clinic.id }}>
            عرض الطبيب
          </Link>
        </Button>
        {onQuickBook && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onQuickBook(clinic)}
            className="px-4 font-extrabold transition active:scale-95"
          >
            حجز سريع
          </Button>
        )}
      </div>
    </article>
  );
}

/* كبسولة عيادة زجاجية للكواروسيل الأفقي */
function ClinicCapsule({ clinic, profile, onQuickBook }: { clinic: Clinic; profile?: ClinicProfileExtras; onQuickBook?: (clinic: Clinic) => void }) {
  const specialty = specialties.find((item) => item.id === clinic.specialtyId);
  const rating = profile?.reviewsCount ? profile.ratingAvg : clinic.rating;
  return (
    <article className="glass-liquid group flex w-64 shrink-0 snap-start flex-col rounded-2xl p-3 text-right transition active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        to="/patient/clinic/$id"
        params={{ id: clinic.id }}
        className="flex min-w-0 items-start gap-2.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-primary">
          <img src={profile?.avatarUrl || defaultDoctorAvatar(clinic.doctor)} alt={clinic.doctor} className="h-full w-full object-cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{clinic.doctor}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {specialty?.name} • {clinic.area}
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs font-bold text-warning">
            {clinic.isDemo ? (
              "بيانات تجريبية"
            ) : (
              <>
                <Star className="h-3 w-3 fill-warning" />
                {rating ? rating.toFixed(1) : "جديد"}
              </>
            )}
            <span className="text-muted-foreground">• {clinic.distanceKm.toFixed(1)} كم</span>
          </span>
        </span>
      </Link>
      <Button
        size="sm"
        onClick={() => onQuickBook?.(clinic)}
        className="btn-liquid-primary mt-2.5 w-full rounded-full py-2 text-xs font-extrabold transition active:scale-95"
      >
        حجز سريع
      </Button>
    </article>
  );
}

function ClinicPlaceholder({
  compact = false,
  cover = false,
}: {
  compact?: boolean;
  cover?: boolean;
}) {
  if (cover)
    return (
      <div className="relative grid h-full place-items-center overflow-hidden bg-primary-soft">
        <Building2 className="h-16 w-16 text-primary/55" />
        <HeartPulse className="absolute h-7 w-7 translate-x-4 translate-y-2 rounded-full bg-card p-1.5 text-primary shadow-soft" />
      </div>
    );
  return (
    <span className="relative grid h-full w-full place-items-center bg-primary-soft text-primary">
      <Hospital className={compact ? "h-7 w-7" : "h-9 w-9"} />
      <HeartPulse className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-card p-0.5" />
    </span>
  );
}
