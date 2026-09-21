import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Clock, MapPin, Phone, Pill, Search, Siren, Star, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { specialties, getVerifiedClinics, type Clinic } from "@/lib/mock-data";
import { NotificationsBell } from "@/components/NotificationsBell";
import { StoryViewer } from "@/components/StoryViewer";
import { getClinicProfileExtras, type ClinicProfileExtras } from "@/lib/clinic-profile";
import { getClinicStories, type StoryItem } from "@/lib/stories";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/patient/")({
  head: () => ({
    meta: [
      { title: "سندي — الصفحة الرئيسية للمريض" },
      { name: "description", content: "دور على طبيب من التخصصات القريبة منك واحجز فوراً." },
    ],
  }),
  component: PatientHome,
});

function PatientHome() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ClinicProfileExtras>>({});
  const [stories, setStories] = useState<Record<string, StoryItem[]>>({});
  const [viewer, setViewer] = useState<{ clinic: Clinic; items: StoryItem[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVerifiedClinics().then(async (list) => {
      if (cancelled) return;
      setClinics(list);
      const visible = list.slice(0, 10);
      const results = await Promise.all(visible.map(async (clinic) => {
        const [profile, storySet] = await Promise.all([
          getClinicProfileExtras(clinic.id),
          getClinicStories(clinic.id),
        ]);
        return { id: clinic.id, profile, items: storySet.stories };
      }));
      if (cancelled) return;
      setProfiles(Object.fromEntries(results.map((result) => [result.id, result.profile])));
      setStories(Object.fromEntries(results.map((result) => [result.id, result.items])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(() => clinics.filter((clinic) => clinic.availableNow).slice(0, 10), [clinics]);
  const recommended = useMemo(
    () => [...clinics].sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm).slice(0, 6),
    [clinics],
  );

  return (
    <AppShell
      title="أهلاً بيك 👋"
      subtitle="صحتك أقرب وأسهل مع سندي"
      tone="primary"
      right={<NotificationsBell audience="patient" />}
      wide
      hideBack
      centeredTitle
    >
      <section className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">موقعك الحالي</p>
            <p className="truncate text-sm font-bold">المهندسين، الجيزة</p>
          </div>
        </div>
        <Button variant="secondary" size="sm">تغيير الموقع</Button>
      </section>

      <Link to="/patient/search" className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition hover:border-primary/50">
        <Search className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 text-sm text-muted-foreground">دور على طبيب، تخصص أو عيادة…</span>
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-lg font-extrabold">عيادات نشطة الآن</h2><p className="text-xs text-muted-foreground">اضغط لمشاهدة آخر تحديثات العيادة</p></div>
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
                onClick={() => clinicStories.length ? setViewer({ clinic, items: clinicStories }) : undefined}
                className="group w-[78px] shrink-0 snap-start text-center"
                aria-label={`مشاهدة تحديثات ${clinic.doctor}`}
              >
                <span className={`mx-auto block h-[68px] w-[68px] rounded-full p-[3px] ${clinicStories.length ? "gradient-story" : "bg-border"}`}>
                  <span className="grid h-full w-full place-items-center overflow-hidden rounded-full border-[3px] border-background bg-card text-2xl">
                    {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={clinic.doctor} className="h-full w-full object-cover" /> : specialties.find((s) => s.id === clinic.specialtyId)?.emoji ?? "🩺"}
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-xs font-bold group-hover:text-primary">{clinic.doctor.replace(/^د\.?\s*/, "د. ")}</span>
              </button>
            );
          })}
          {active.length === 0 && <p className="w-full rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">لا توجد عيادات نشطة الآن</p>}
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <ServiceCard to="/patient/emergency" icon={<Siren />} title="طوارئ وعيادات مفتوحة" description="مساعدة طبية واتصال سريع 24 ساعة" tone="danger" action={<a href="tel:123" onClick={(event) => event.stopPropagation()} aria-label="اتصال بالإسعاف 123" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground"><Phone className="h-4 w-4" /></a>} />
        <ServiceCard to="/patient/health" icon={<Activity />} title="مؤشرات الصحة" description="تابع الضغط والسكر وسجّل قراءاتك" tone="primary" />
        <ServiceCard to="/patient/meds" icon={<Pill />} title="مواعيد الأدوية" description="نظّم الجرعات ولا تفوّت دواءك" tone="warning" />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">اختار التخصص</h2><Link to="/patient/search" className="text-xs font-bold text-primary">عرض الكل</Link></div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {specialties.slice(0, 8).map((specialty, index) => (
          <Link
            key={specialty.id}
            to="/patient/search"
            className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-soft"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${index % 4 === 0 ? "bg-primary-soft" : index % 4 === 1 ? "bg-warning/15" : index % 4 === 2 ? "bg-success/15" : "bg-destructive/10"}`}>{specialty.emoji}</span>
            <span className="truncate text-sm font-bold group-hover:text-primary">{specialty.name}</span>
          </Link>
        ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-extrabold">أبرز العيادات القريبة منك</h2><p className="text-xs text-muted-foreground">الأعلى تقييماً والأقرب لموقعك</p></div><Link to="/patient/search" className="shrink-0 text-xs font-bold text-primary">المزيد</Link></div>
        {recommended.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-border bg-card p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold">لسه ما فيش عيادات موثّقة</p>
            <p className="mt-1 text-xs text-muted-foreground">العيادات هتظهر هنا بعد توثيقها.</p>
          </div>
        ) : <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recommended.map((clinic) => <ClinicCard key={clinic.id} clinic={clinic} profile={profiles[clinic.id]} />)}</div>}
      </section>

      {viewer && <StoryViewer items={viewer.items} title={viewer.clinic.doctor} onClose={() => setViewer(null)} />}
    </AppShell>
  );
}

function ServiceCard({ to, icon, title, description, tone, action }: { to: "/patient/emergency" | "/patient/health" | "/patient/meds"; icon: React.ReactNode; title: string; description: string; tone: "danger" | "primary" | "warning"; action?: React.ReactNode }) {
  const toneClasses = tone === "danger" ? "border-destructive/35 bg-destructive/10 text-destructive" : tone === "warning" ? "border-warning/30 bg-warning/10 text-warning" : "border-primary/35 bg-primary-soft/30 text-primary";
  return <Link to={to} className={`group flex min-h-32 items-start gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${toneClasses}`}><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card [&_svg]:h-6 [&_svg]:w-6">{icon}</span><span className="min-w-0 flex-1"><span className="block font-extrabold text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>{action}</Link>;
}

function ClinicCard({ clinic, profile }: { clinic: Clinic; profile?: ClinicProfileExtras }) {
  const specialty = specialties.find((item) => item.id === clinic.specialtyId);
  const rating = profile?.reviewsCount ? profile.ratingAvg : clinic.rating;
  return <article className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
    <Link to="/patient/clinic/$id" params={{ id: clinic.id }} className="block">
      <div className="relative aspect-[16/7] bg-primary-soft">
        {profile?.coverUrl ? <img src={profile.coverUrl} alt={`عيادة ${clinic.doctor}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl">{specialty?.emoji ?? "🩺"}</div>}
        {clinic.availableNow && <span className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-1 text-[10px] font-extrabold text-success-foreground">متاح الآن</span>}
      </div>
      <div className="flex min-w-0 items-start gap-3 p-4 pb-3">
        <span className="-mt-9 grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-card bg-primary-soft text-xl">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt={clinic.doctor} className="h-full w-full object-cover" /> : specialty?.emoji}</span>
        <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{clinic.doctor}</span><span className="block truncate text-xs text-muted-foreground">{specialty?.name} • {clinic.area}</span></span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Star className="h-4 w-4 fill-warning text-warning" />{rating || "جديد"}</span>
      </div>
    </Link>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-4 py-3">
      <div className="min-w-0 text-xs text-muted-foreground"><span className="font-bold text-foreground">{clinic.price} ج</span><span> • </span><Clock className="inline h-3.5 w-3.5" /> <span>حوالي {clinic.waitingCount * 10} د</span></div>
      <Button asChild size="sm"><Link to="/patient/clinic/$id" params={{ id: clinic.id }}>حجز دور الآن</Link></Button>
    </div>
  </article>;
}