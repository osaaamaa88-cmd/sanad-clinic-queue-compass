import { defaultDoctorAvatar } from "@/lib/default-avatars";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardList,
  Globe2,
  Hospital,
  MapPin,
  MessageCircleHeart,
  Search,
  Star,
  Siren,
  ScanLine,
  X,
} from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { AppShell } from "@/components/AppShell";
import { Reveal } from "@/components/motion/Reveal";
import { NemoBreathingCard } from "@/components/NemoBreathingCard";
import { QueueTrackerCard } from "@/components/QueueTrackerCard";
import { SanadHealthPassCard } from "@/components/medical/SanadHealthPassCard";
import { HealthActivityCarousel } from "@/components/HealthActivityCarousel";
import { QuickBookingDrawer } from "@/components/booking/QuickBookingDrawer";
import heart3d from "@/assets/3d-heart.png";
import bell3d from "@/assets/3d-bell.png";
import pill3d from "@/assets/3d-pill.png";
import { specialties, type Clinic } from "@/lib/mock-data";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";
const StoryViewer = lazy(() =>
  import("@/components/StoryViewer").then((m) => ({ default: m.StoryViewer })),
);
import { type StoryItem } from "@/lib/stories";
import { Button } from "@/components/ui/button";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { distanceKm, savePatientLocation } from "@/lib/patient-location";
import { usePatientHomeData } from "@/hooks/use-patient-home-data";
import { AllSpecialtiesSheet } from "@/components/patient-home/AllSpecialtiesSheet";
import { ClinicCapsule } from "@/components/patient-home/ClinicCapsule";
import { HydrationTracker } from "@/components/patient-home/HydrationTracker";

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
  const {
    clinics,
    clinicsLoaded,
    profiles,
    stories,
    location,
    setLocation,
    patientName,
    patientAvatar,
    healthSnapshot,
    upcomingBooking,
    hydration,
    setHydration,
  } = usePatientHomeData();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [viewer, setViewer] = useState<{ clinic: Clinic; items: StoryItem[] } | null>(null);
  const [selectedClinicForBooking, setSelectedClinicForBooking] = useState<Clinic | null>(null);
  const [bookingDrawerOpen, setBookingDrawerOpen] = useState(false);
  const featuredClinicsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (selectedSpecialty) {
      featuredClinicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSpecialty]);

  // تحية حسب توقيت اليوم (صباحاً / مساءً)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "طاب يومك";
    return "مساء الخير";
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
  const handleOpenQuickBooking = useCallback((clinic: Clinic) => {
    setSelectedClinicForBooking(clinic);
    setBookingDrawerOpen(true);
  }, []);

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
      {/* ===== MoveSync: تحية + بحث ===== */}
      <section className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-lg font-extrabold text-primary ring-2 ring-border">
            {patientAvatar ? (
              <img src={patientAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              (patientName || "س").slice(0, 1)
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-black">
              أهلاً، {patientName ? patientName.split(" ")[0] : "يا بطل"}
            </p>
            <button
              type="button"
              onClick={() => setLocOpen(true)}
              className="flex min-h-6 items-center gap-1 text-xs font-bold text-muted-foreground"
              aria-label="تغيير الموقع"
            >
              <MapPin className="h-3 w-3 text-primary" />
              {location.city} ·{" "}
              {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
            </button>
          </div>
        </div>
        <Link
          to="/patient/search"
          aria-label="بحث"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card active:scale-95"
        >
          <Search className="h-5 w-5" />
        </Link>
      </section>

      {/* ===== كارت اليوم ===== */}
      <Link
        to="/patient/assistant"
        className="relative mb-4 block overflow-visible rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft active:scale-[0.98] transition"
      >
        <p className="max-w-[60%] text-2xl font-black leading-tight">{greeting}</p>
        <p className="mt-1 max-w-[60%] text-xs font-bold opacity-85">اسأل نيمو عن أي عرض</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-xs font-extrabold">
          <MessageCircleHeart className="h-4 w-4" /> كلّم نيمو
        </span>
        <img
          src={heart3d}
          alt=""
          aria-hidden
          width={816}
          height={816}
          className="sanad-float pointer-events-none absolute -top-5 left-1 h-32 w-32 object-contain drop-shadow-xl"
        />
      </Link>

      {/* ===== كبسولات الأسبوع ===== */}
      <section aria-label="الأسبوع" className="mb-5 grid grid-cols-6 gap-1.5">
        {Array.from({ length: 6 }, (_, k) => {
          const d = new Date();
          d.setDate(d.getDate() + k - 2);
          const today = k === 2;
          return (
            <div
              key={k}
              className={`flex flex-col items-center gap-0.5 rounded-full border py-2.5 text-xs font-bold ${
                today ? "border-foreground bg-foreground text-background" : "border-border bg-card"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${today ? "fill-current" : "fill-foreground/80"}`} />
              <span>{d.toLocaleDateString("ar-EG", { weekday: "short" })}</span>
              <span className="text-sm font-black">{d.getDate()}</span>
            </div>
          );
        })}
      </section>

      {/* ===== خطتك ===== */}
      <h2 className="mb-3 text-lg font-black">خطتك</h2>
      <Reveal as="section" index={0} aria-label="خطتك" className="mb-6 grid grid-cols-2 gap-3">
        <Link
          to="/patient/search"
          className="relative row-span-2 flex min-h-64 flex-col overflow-visible rounded-3xl bg-gold-soft p-4 text-foreground active:scale-[0.98] transition"
        >
          <span className="text-xs font-bold text-muted-foreground">
            {upcomingBooking ? "موعدك" : "احجز"}
          </span>
          <span className="mt-1 text-lg font-black leading-6">
            {upcomingBooking ? upcomingBooking.clinicName : "عيادة قريبة"}
          </span>
          <span className="mt-1 text-xs font-bold text-muted-foreground">
            {upcomingBooking ? `دورك ${upcomingBooking.code}` : "بدون طابور"}
          </span>
          <img
            src={bell3d}
            alt=""
            aria-hidden
            loading="lazy"
            width={816}
            height={816}
            className="sanad-float pointer-events-none absolute bottom-10 -left-3 h-28 w-28 object-contain drop-shadow-xl"
          />
        </Link>

        <Link
          to="/patient/health"
          className="relative flex min-h-32 flex-col overflow-hidden rounded-3xl bg-primary-soft p-4 active:scale-[0.98] transition"
        >
          <span className="text-xs font-bold text-muted-foreground">صحتك</span>
          <span className="mt-1 text-base font-black">
            {healthSnapshot.bp || healthSnapshot.sugar ? "القياسات" : "سجّل قياس"}
          </span>
          <span className="mt-1 text-xs font-bold text-muted-foreground">
            {healthSnapshot.bp ? `ضغط ${healthSnapshot.bp}` : "ضغط · سكر"}
          </span>
          <img
            src={pill3d}
            alt=""
            aria-hidden
            loading="lazy"
            width={816}
            height={816}
            className="pointer-events-none absolute -bottom-3 -left-3 h-20 w-20 object-contain"
          />
        </Link>

        <div className="flex items-center justify-around rounded-3xl bg-success/20 p-2">
          {[
            { to: "/patient/emergency", icon: Siren, label: "طوارئ", cls: "text-destructive" },
            { to: "/patient/drug-scan", icon: ClipboardList, label: "روشتة", cls: "" },
            { to: "/patient/scan", icon: ScanLine, label: "مسح", cls: "" },
          ].map(({ to, icon: Icon, label, cls }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-soft active:scale-90"
            >
              <Icon className={`h-5 w-5 ${cls}`} />
            </Link>
          ))}
        </div>
      </Reveal>
      {upcomingBooking && <QueueTrackerCard key={upcomingBooking.code} />}
      <SanadHealthPassCard />

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

      <Reveal as="section" index={1} className="mt-6">
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
                  clinicStories.length
                    ? setViewer({ clinic, items: clinicStories })
                    : void goDoctor({
                        to: "/patient/clinic/$id",
                        params: { id: clinic.id },
                      })
                }
                className="group w-[78px] shrink-0 snap-start text-center transition active:scale-95"
                aria-label={`مشاهدة تحديثات ${clinic.doctor}`}
              >
                <span
                  className={`mx-auto block h-[68px] w-[68px] rounded-full p-[3px] ${clinicStories.length ? "gradient-story" : "bg-border"}`}
                >
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-background bg-card text-2xl">
                    <img
                      src={profile?.avatarUrl || defaultDoctorAvatar()}
                      alt={clinic.doctor}
                      className="h-full w-full object-cover"
                    />
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-xs font-bold group-hover:text-primary">
                  {clinic.doctor.replace(/^د\.?\s*/, "د. ")}
                </span>
                {clinic.isDemo && (
                  <span className="mt-1 block text-xs font-bold text-warning">بيانات تجريبية</span>
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
      </Reveal>

      <Reveal as="section" index={2} className="mt-8">
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
                  <span className="mt-0.5 block text-xs font-medium leading-4 text-muted-foreground">
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
              <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                {specialties.length} تخصص
              </span>
            </span>
          </Button>
        </div>
      </Reveal>

      <section ref={featuredClinicsRef} className="mt-8 scroll-mt-24">
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
              <ClinicCapsule
                key={clinic.id}
                clinic={clinic}
                profile={profiles[clinic.id]}
                onQuickBook={handleOpenQuickBooking}
              />
            ))}
          </div>
        )}
      </section>

      <HealthActivityCarousel />
      <Reveal as="section" index={3} className="mt-6 grid gap-3 sm:grid-cols-2">
        <NemoBreathingCard />

        <HydrationTracker hydration={hydration} onHydrationChange={setHydration} />
      </Reveal>

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
