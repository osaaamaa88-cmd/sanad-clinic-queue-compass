import { Reveal } from "@/components/motion/Reveal";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import {
  Map as MapIcon,
  List,
  Stethoscope,
  Search as SearchIcon,
  X,
  ArrowUpDown,
  ChevronLeft,
  LayoutGrid,
} from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { AppShell } from "@/components/AppShell";
const ClinicsMap = lazy(() =>
  import("@/components/ClinicsMap").then((m) => ({ default: m.ClinicsMap })),
);
import { specialties } from "@/lib/mock-data";
import { ClinicListCard } from "@/components/search/ClinicListCard";
import { ClinicSheet } from "@/components/search/ClinicSheet";
import { HospitalCard } from "@/components/search/HospitalCard";
import { useClinicSearch } from "@/hooks/use-clinic-search";

export const Route = createFileRoute("/patient/search")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سند — ابحث عن عيادة قريبة" },
      {
        name: "description",
        content: "شوف أقرب العيادات على الخريطة وقائمة بالأسعار والتقييمات واحجز دورك.",
      },
      { property: "og:title", content: "سند — ابحث عن عيادة قريبة" },
      {
        property: "og:description",
        content: "شوف أقرب العيادات على الخريطة واحجز دورك وتابعه لحظياً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Search,
});

function Search() {
  const {
    view,
    setView,
    spec,
    setSpec,
    kind,
    setKind,
    q,
    setQ,
    sort,
    setSort,
    openNow,
    setOpenNow,
    selected,
    setSelected,
    pos,
    applyGpsPosition,
    filtered,
  } = useClinicSearch();

  return (
    <AppShell
      title="العيادات القريبة"
      subtitle={`${filtered.length} نتيجة حواليك`}
      backTo="/patient"
    >
      <Link
        to="/find-doctor"
        className="mb-3 flex items-center gap-3 rounded-3xl tile-3d border border-primary/40 bg-primary/10 px-3 py-3"
      >
        <SearchIcon className="h-5 w-5 text-primary" />
        <span className="flex-1 text-sm font-bold">بحث دقيق عن طبيب</span>
        <ChevronLeft className="h-4 w-4 text-primary" />
      </Link>
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-3xl tile-3d border border-border bg-card px-3 py-2.5">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالطبيب، المستشفى، أو المنطقة…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="مسح" className="text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sort */}
      <div className="mt-3 -mx-5 overflow-x-auto px-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenNow((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              openNow ? "bg-success text-success-foreground" : "bg-secondary text-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${openNow ? "animate-pulse bg-success-foreground" : "bg-success"}`}
            />
            متاح الآن
          </button>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" /> ترتيب:
          </span>
          {(
            [
              { id: "nearest", label: "الأقرب" },
              { id: "price", label: "الأقل سعراً" },
              { id: "reviews", label: "تقييمات أكثر" },
              { id: "rating", label: "الأعلى تقييماً" },
            ] as { id: typeof sort; label: string }[]
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setSort(o.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                sort === o.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialty cards */}
      <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          {[
            { id: null as string | null, name: "كل التخصصات", Icon: LayoutGrid },
            ...specialties.map((s) => ({
              id: s.id as string | null,
              name: s.name,
              Icon: specialtyIcons[s.id] ?? Stethoscope,
            })),
          ].map(({ id, name, Icon }) => {
            const active = spec === id;
            return (
              <button
                key={id ?? "all"}
                onClick={() => setSpec(id)}
                className={`flex w-[72px] shrink-0 flex-col items-center gap-1.5 rounded-3xl tile-3d border bg-card p-2.5 text-center transition active:scale-95 ${
                  active ? "border-primary shadow-soft" : "border-border"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "gradient-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className={`w-full truncate text-xs font-bold ${active ? "text-primary" : ""}`}
                >
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            ["all", "كل المنشآت"],
            ["hospital", "مستشفيات حكومية"],
            ["clinic", "عيادات"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-2 py-1.5 text-xs font-bold ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Toggle */}
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
        <button
          onClick={() => setView("list")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${
            view === "list" ? "bg-card shadow-soft" : "text-muted-foreground"
          }`}
        >
          <List className="h-4 w-4" /> قائمة
        </button>
        <button
          onClick={() => setView("map")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold ${
            view === "map" ? "bg-card shadow-soft" : "text-muted-foreground"
          }`}
        >
          <MapIcon className="h-4 w-4" /> خريطة
        </button>
      </div>

      {view === "map" && (
        <div className="mt-4 overflow-hidden rounded-3xl tile-3d border border-border bg-card">
          <ClientOnly
            fallback={
              <div className="grid h-[60vh] w-full place-items-center text-sm text-muted-foreground">
                جاري تحميل الخريطة…
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="grid h-[60vh] w-full place-items-center text-sm text-muted-foreground">
                  جاري تحميل الخريطة…
                </div>
              }
            >
              <ClinicsMap
                clinics={filtered}
                center={pos}
                selectedId={selected?.id ?? null}
                onSelect={(c) => setSelected(c)}
                onLocate={applyGpsPosition}
              />
            </Suspense>
          </ClientOnly>
        </div>
      )}

      {view === "map" && selected && filtered.some((c) => c.id === selected.id) && (
        <ClinicSheet clinic={selected} onClose={() => setSelected(null)} />
      )}

      {view === "list" && (
        <div className="mt-4 space-y-3">
          {filtered.length === 0 && (
            <div className="rounded-3xl tile-3d border-2 border-dashed border-border bg-card p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                <Stethoscope className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-bold">لا توجد عيادات موثّقة حالياً</p>
              <p className="mt-1 text-xs text-muted-foreground">
                العيادات الجديدة بتظهر هنا بعد توثيقها من إدارة التطبيق.
              </p>
            </div>
          )}
          {filtered.map((c, i) => {
            if (c.kind === "hospital")
              return (
                <Reveal key={c.id} index={i}>
                  <HospitalCard c={c} />
                </Reveal>
              );
            return (
              <Reveal key={c.id} index={i}>
                <ClinicListCard c={c} />
              </Reveal>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
