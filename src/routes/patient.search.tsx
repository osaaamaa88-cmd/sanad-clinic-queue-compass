import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Map as MapIcon, List, MapPin, Star, Stethoscope, Search as SearchIcon, X, ArrowUpDown, BadgeCheck, Users, ChevronLeft, Navigation, LayoutGrid, Route as RouteIcon } from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { AppShell } from "@/components/AppShell";
import { ClinicsMap } from "@/components/ClinicsMap";
import { getVerifiedClinics, specialties, getSpecialty, type Clinic } from "@/lib/mock-data";
import { getPatientLocation } from "@/lib/patient-location";

export const Route = createFileRoute("/patient/search")({
  head: () => ({
    meta: [
      { title: "سَنَد — ابحث عن عيادة قريبة" },
      { name: "description", content: "شوف أقرب العيادات على الخريطة وقائمة بالأسعار والتقييمات واحجز دورك." },
      { property: "og:title", content: "سَنَد — ابحث عن عيادة قريبة" },
      { property: "og:description", content: "شوف أقرب العيادات على الخريطة واحجز دورك وتابعه لحظياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Search,
});

function Search() {
  const [view, setView] = useState<"list" | "map">("list");
  const [spec, setSpec] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"nearest" | "price" | "reviews" | "rating">("nearest");
  const [openNow, setOpenNow] = useState(false);
  const [selected, setSelected] = useState<Clinic | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number }>({ lat: 30.0444, lng: 31.2357 });
  useEffect(() => {
    const saved = getPatientLocation();
    setPos({ lat: saved.lat, lng: saved.lng });
  }, []);
  useEffect(() => {
    let cancelled = false;
    getVerifiedClinics().then((list) => {
      if (!cancelled) setClinics(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 6000 },
    );
  }, []);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = clinics;
    if (spec) list = list.filter((c) => c.specialtyId === spec);
    if (openNow) list = list.filter((c) => c.availableNow);
    if (term) {
      list = list.filter((c) => {
        const s = getSpecialty(c.specialtyId);
        return (
          c.doctor.toLowerCase().includes(term) ||
          c.area.toLowerCase().includes(term) ||
          c.address.toLowerCase().includes(term) ||
          (s?.name.toLowerCase().includes(term) ?? false)
        );
      });
    }
    const sorted = [...list];
    if (sort === "price") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "reviews") sorted.sort((a, b) => b.reviews - a.reviews);
    else if (sort === "rating") sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => a.distanceKm - b.distanceKm);
    return sorted;
  }, [clinics, spec, q, sort, openNow]);

  return (
    <AppShell title="العيادات القريبة" subtitle={`${filtered.length} عيادة حواليك`} backTo="/patient">
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالطبيب، التخصص، أو المنطقة…"
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
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
              openNow ? "bg-success text-success-foreground" : "bg-secondary text-foreground"
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${openNow ? "animate-pulse bg-success-foreground" : "bg-success"}`} />
            متاح الآن
          </button>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" /> ترتيب:
          </span>
          {(
            [
              { id: "nearest", label: "الأقرب" },
              { id: "price", label: "الأقل سعراً" },
              { id: "reviews", label: "الأكثر تقييماً" },
              { id: "rating", label: "الأعلى تقييماً" },
            ] as { id: typeof sort; label: string }[]
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setSort(o.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                sort === o.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialty chips */}
      <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setSpec(null)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${
              spec === null ? "gradient-primary text-white" : "bg-secondary text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            الكل
          </button>
          {specialties.map((s) => {
            const SpecIcon = specialtyIcons[s.id] ?? Stethoscope;
            return (
              <button
                key={s.id}
                onClick={() => setSpec(s.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold ${
                  spec === s.id ? "gradient-primary text-white" : "bg-secondary text-foreground"
                }`}
              >
                <SpecIcon className="h-3.5 w-3.5" />
                {s.name}
              </button>
            );
          })}
        </div>
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
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <ClientOnly
            fallback={<div className="grid h-[60vh] w-full place-items-center text-sm text-muted-foreground">جاري تحميل الخريطة…</div>}
          >
            <ClinicsMap
              clinics={filtered}
              center={pos}
              selectedId={selected?.id}
              onSelect={(c) => setSelected(c)}
            />
          </ClientOnly>
          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            دوس على أي عيادة على الخريطة تشوف تفاصيلها ورقم الدور الحالي.
          </div>
        </div>
      )}

      {view === "map" && selected && (
        <ClinicSheet clinic={selected} onClose={() => setSelected(null)} />
      )}

      {view === "list" && (
      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold">لا توجد عيادات موثّقة حالياً</p>
            <p className="mt-1 text-xs text-muted-foreground">
              العيادات الجديدة بتظهر هنا بعد توثيقها من إدارة التطبيق.
            </p>
          </div>
        )}
        {filtered.map((c) => {
          const s = getSpecialty(c.specialtyId);
          const SpecIcon = (s && specialtyIcons[s.id]) || Stethoscope;
          return (
            <Link
              key={c.id}
              to="/patient/clinic/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border border-border bg-card p-4 transition hover:shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <SpecIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{c.doctor}</p>
                    {c.availableNow && (
                      <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                        متاح
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{s?.name}</p>
                  <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{c.address} — {c.area}</span>
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" /> {c.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Route className="h-3 w-3" /> {c.distanceKm} كم
                      </span>
                    </div>
                    <span className="rounded-lg bg-primary-soft px-2 py-1 text-sm font-extrabold text-primary">
                      {c.price} ج
                    </span>
                  </div>
                  <span className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl gradient-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-soft">
                    احجز دورك الآن <ChevronLeft className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </AppShell>
  );
}

function ClinicSheet({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const s = getSpecialty(clinic.specialtyId);
  const SpecIcon = (s && specialtyIcons[s.id]) || Stethoscope;
  return (
    <>
      <button
        onClick={onClose}
        aria-label="إغلاق البطاقة"
        className="fixed inset-0 z-20 bg-black/40 transition-opacity"
      />
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md sm:max-w-xl">
      <div className="animate-sheet-up relative rounded-t-3xl border-t border-border bg-card p-4 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,.45)] sm:p-5">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
        <button
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <SpecIcon className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-extrabold">{clinic.doctor}</p>
              {clinic.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="موثّق" />}
            </div>
            <p className="text-xs text-muted-foreground">{s?.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {clinic.area || "—"} • {clinic.distanceKm} كم
            </p>
          </div>
          <span className="rounded-lg bg-primary-soft px-2 py-1 text-sm font-extrabold text-primary">
            {clinic.price ? `${clinic.price} ج` : "—"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-secondary p-2">
            <div className="text-lg font-black text-primary">{clinic.nowServing}</div>
            <div className="text-[10px] text-muted-foreground">الدور الحالي</div>
          </div>
          <div className="rounded-xl bg-secondary p-2">
            <div className="flex items-center justify-center gap-1 text-lg font-black">
              <Users className="h-4 w-4 text-muted-foreground" />{clinic.waitingCount}
            </div>
            <div className="text-[10px] text-muted-foreground">في الانتظار</div>
          </div>
          <div className="rounded-xl bg-secondary p-2">
            <div className="flex items-center justify-center gap-1 text-lg font-black">
              <Star className="h-4 w-4 fill-warning text-warning" />{clinic.rating}
            </div>
            <div className="text-[10px] text-muted-foreground">التقييم</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2">
          {clinic.lat && clinic.lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-secondary px-4 py-4 text-sm font-bold"
            >
              <Navigation className="h-4 w-4" /> الاتجاهات
            </a>
          ) : <span />}
          <Link
            to="/patient/clinic/$id"
            params={{ id: clinic.id }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-primary-foreground shadow-soft"
          >
            احجز دورك <ChevronLeft className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}