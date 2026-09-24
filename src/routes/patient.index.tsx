import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Activity, ArrowLeft, Baby, Bone, Brain, Clock, Ear, Eye, Globe2, HeartPulse, MapPin, Pill, Search, Siren, Star, Stethoscope, X } from "lucide-react";
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
      { property: "og:title", content: "سندي — سندك الطبي في كل وقت" },
      { property: "og:description", content: "اكتشف العيادات القريبة وتابع تحديثاتها واحجز دورك بسهولة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientHome,
});

function PatientHome() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ClinicProfileExtras>>({});
  const [stories, setStories] = useState<Record<string, StoryItem[]>>({});
  const [viewer, setViewer] = useState<{ clinic: Clinic; items: StoryItem[] } | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [specialtiesOpen, setSpecialtiesOpen] = useState(false);

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
  const availableCounts = useMemo(() => clinics.reduce<Record<string, number>>((counts, clinic) => {
    if (clinic.availableNow) counts[clinic.specialtyId] = (counts[clinic.specialtyId] ?? 0) + 1;
    return counts;
  }, {}), [clinics]);
  const selectedSpecialtyData = specialties.find((item) => item.id === selectedSpecialty);
  const recommended = useMemo(
    () => [...clinics]
      .filter((clinic) => !selectedSpecialty || clinic.specialtyId === selectedSpecialty)
      .sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm)
      .slice(0, selectedSpecialty ? undefined : 6),
    [clinics, selectedSpecialty],
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
                    {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={clinic.doctor} className="h-full w-full object-cover" /> : <Stethoscope className="h-7 w-7 text-primary" />}
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
        <ServiceCard to="/patient/emergency" icon={<Siren />} title="طوارئ وعيادات مفتوحة" description="مساعدة طبية واتصال سريع 24 ساعة" tone="danger" />
        <ServiceCard to="/patient/health" icon={<Activity />} title="مؤشرات الصحة" description="تابع الضغط والسكر وسجّل قراءاتك" tone="primary" />
        <ServiceCard to="/patient/meds" icon={<Pill />} title="مواعيد الأدوية" description="نظّم الجرعات ولا تفوّت دواءك" tone="warning" />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">اختار التخصص</h2><Button type="button" variant="link" size="sm" onClick={() => setSpecialtiesOpen(true)} className="h-auto p-0 text-xs font-bold">شوف الكل</Button></div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {specialties.slice(0, 8).map((specialty, index) => {
            const SpecialtyIcon = specialtyIcons[specialty.id] ?? Stethoscope;
            const isSelected = selectedSpecialty === specialty.id;
            return (
          <Button
            key={specialty.id}
            type="button"
            variant="ghost"
            onClick={() => setSelectedSpecialty(specialty.id)}
            aria-pressed={isSelected}
            className={`group h-auto min-w-0 justify-start gap-3 whitespace-normal rounded-xl border bg-card p-3 text-right transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-card hover:shadow-soft active:scale-[0.97] ${isSelected ? "border-primary shadow-soft ring-1 ring-primary/50" : "border-border hover:border-primary/50"}`}
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${index % 4 === 0 ? "bg-primary-soft text-primary" : index % 4 === 1 ? "bg-warning/15 text-warning" : index % 4 === 2 ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}><SpecialtyIcon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold group-hover:text-primary">{specialty.name}</span><span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{availableCounts[specialty.id] ?? 0} عيادة مفتوحة</span></span>
          </Button>
          );})}
          <Button type="button" variant="ghost" onClick={() => setSpecialtiesOpen(true)} className="group h-auto min-w-0 justify-start gap-3 whitespace-normal rounded-xl border border-primary/35 bg-card p-3 text-right transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-card hover:shadow-soft active:scale-[0.97]">
            <span className="grid h-11 w-11 shrink-0 animate-pulse place-items-center rounded-xl bg-primary-soft text-primary"><Globe2 className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold group-hover:text-primary">كل التخصصات</span><span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{specialties.length} تخصص</span></span>
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-extrabold">{selectedSpecialtyData ? `عيادات ${selectedSpecialtyData.name}` : "أبرز العيادات القريبة منك"}</h2><p className="text-xs text-muted-foreground">{selectedSpecialtyData ? `${recommended.length} عيادة متاحة في هذا التخصص` : "الأعلى تقييماً والأقرب لموقعك"}</p></div><Link to="/patient/search" className="shrink-0 text-xs font-bold text-primary">المزيد</Link></div>
        {selectedSpecialtyData && <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-primary/35 bg-primary-soft/30 px-3 py-2"><span className="min-w-0 truncate text-xs font-bold text-primary">الفلتر: {selectedSpecialtyData.emoji} {selectedSpecialtyData.name}</span><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedSpecialty(null)} className="h-7 shrink-0 px-2 text-xs text-primary"><X className="h-3.5 w-3.5" />إلغاء</Button></div>}
        {recommended.length === 0 ? (
          <div className="mt-3 rounded-xl border-2 border-dashed border-border bg-card p-7 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold">{selectedSpecialtyData ? `لا توجد عيادات ${selectedSpecialtyData.name} متاحة حالياً` : "لسه ما فيش عيادات موثّقة"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedSpecialtyData ? "جرّب تخصصاً آخر أو ألغِ الفلتر." : "العيادات هتظهر هنا بعد توثيقها."}</p>
          </div>
        ) : <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{recommended.map((clinic) => <ClinicCard key={clinic.id} clinic={clinic} profile={profiles[clinic.id]} />)}</div>}
      </section>

      {specialtiesOpen && <AllSpecialtiesSheet counts={availableCounts} selected={selectedSpecialty} onSelect={setSelectedSpecialty} onClose={() => setSpecialtiesOpen(false)} />}
      {viewer && <StoryViewer items={viewer.items} title={viewer.clinic.doctor} onClose={() => setViewer(null)} />}
    </AppShell>
  );
}

function ServiceCard({ to, icon, title, description, tone }: { to: "/patient/emergency" | "/patient/health" | "/patient/meds"; icon: ReactNode; title: string; description: string; tone: "danger" | "primary" | "warning" }) {
  const toneClasses = tone === "danger" ? "border-destructive/35 bg-destructive/10 text-destructive" : tone === "warning" ? "border-warning/30 bg-warning/10 text-warning" : "border-primary/35 bg-primary-soft/30 text-primary";
  return <Link to={to} className={`group flex min-h-32 items-start gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${toneClasses}`}><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card [&_svg]:h-6 [&_svg]:w-6">{icon}</span><span className="min-w-0 flex-1"><span className="block font-extrabold text-foreground">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span></Link>;
}

const specialtyIcons: Record<string, typeof Stethoscope> = {
  dental: Stethoscope,
  internal: Activity,
  pediatrics: Baby,
  ortho: Bone,
  derma: Star,
  cardio: HeartPulse,
  eye: Eye,
  ent: Ear,
  neuro: Brain,
};

const specialtyTabs = [
  { id: "popular", label: "الشائعة 🔥" },
  { id: "surgical", label: "جراحية 🩺" },
  { id: "family", label: "أطفال ونساء 👶" },
  { id: "therapy", label: "علاجات وحركة 🦴" },
] as const;

function AllSpecialtiesSheet({ counts, selected, onSelect, onClose }: { counts: Record<string, number>; selected: string | null; onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof specialtyTabs)[number]["id"]>("popular");
  const [closing, setClosing] = useState(false);
  const visibleSpecialties = specialties.filter((specialty) => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery ? specialty.name.toLowerCase().includes(normalizedQuery) : specialty.category === tab;
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

  return <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="specialties-title">
    <button type="button" aria-label="إغلاق التخصصات" onClick={requestClose} className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`} />
    <section className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-border bg-card shadow-gold ${closing ? "animate-sheet-down" : "animate-sheet-up"}`}>
      <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 pb-4 pt-3 sm:px-6">
        <div className="min-w-0"><h2 id="specialties-title" className="text-lg font-extrabold">كل التخصصات الطبية</h2><p className="text-xs text-muted-foreground">اختار التخصص المناسب ليظهر أطباؤه فوراً</p></div>
        <Button type="button" variant="ghost" size="icon" onClick={requestClose} aria-label="إغلاق"><X className="h-5 w-5" /></Button>
      </div>
      <div className="overflow-y-auto px-4 pb-8 pt-4 sm:px-6" style={{ maxHeight: "calc(88vh - 78px)" }}>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
          <Search className="h-5 w-5 shrink-0 text-primary" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن تخصص…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {query && <Button type="button" variant="ghost" size="icon" onClick={() => setQuery("")} aria-label="مسح البحث" className="h-7 w-7"><X className="h-4 w-4" /></Button>}
        </label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="فئات التخصصات">
          {specialtyTabs.map((item) => <Button key={item.id} type="button" role="tab" aria-selected={tab === item.id} variant={tab === item.id ? "default" : "secondary"} size="sm" onClick={() => { setTab(item.id); setQuery(""); }} className="shrink-0 rounded-full">{item.label}</Button>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {visibleSpecialties.map((specialty) => {
            const SpecialtyIcon = specialtyIcons[specialty.id] ?? Stethoscope;
            const isSelected = selected === specialty.id;
            return <Button key={specialty.id} type="button" variant="ghost" onClick={() => chooseSpecialty(specialty.id)} className={`h-auto min-w-0 justify-start gap-3 whitespace-normal rounded-xl border p-3 text-right transition active:scale-[0.97] ${isSelected ? "border-primary bg-primary-soft/30 shadow-soft" : "border-border bg-background hover:border-primary/50 hover:bg-background"}`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><SpecialtyIcon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-xs font-bold leading-5">{specialty.name}</span><span className="block text-[10px] text-muted-foreground">{counts[specialty.id] ?? 0} عيادة مفتوحة</span></span>
            </Button>;
          })}
          {visibleSpecialties.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">لا يوجد تخصص بهذا الاسم</p>}
        </div>
      </div>
    </section>
  </div>;
}

function ClinicCard({ clinic, profile }: { clinic: Clinic; profile?: ClinicProfileExtras }) {
  const specialty = specialties.find((item) => item.id === clinic.specialtyId);
  const rating = profile?.reviewsCount ? profile.ratingAvg : clinic.rating;
  return <article className="overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft">
    <Link to="/patient/clinic/$id" params={{ id: clinic.id }} className="block">
      <div className="relative aspect-[16/7] bg-primary-soft">
        {profile?.coverUrl ? <img src={profile.coverUrl} alt={`عيادة ${clinic.doctor}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Stethoscope className="h-10 w-10 text-primary" /></div>}
        {clinic.availableNow && <span className="absolute right-3 top-3 rounded-full bg-success px-2.5 py-1 text-[10px] font-extrabold text-success-foreground">متاح الآن</span>}
      </div>
      <div className="flex min-w-0 items-start gap-3 p-4 pb-3">
        <span className="-mt-9 grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-card bg-primary-soft text-primary">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt={clinic.doctor} className="h-full w-full object-cover" /> : <Stethoscope className="h-6 w-6" />}</span>
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