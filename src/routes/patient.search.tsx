import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Map as MapIcon, List, MapPin, Star, Clock, Stethoscope, Search as SearchIcon, X, ArrowDownAZ } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getVerifiedClinics, specialties, getSpecialty, type Clinic } from "@/lib/mock-data";

export const Route = createFileRoute("/patient/search")({
  head: () => ({
    meta: [
      { title: "سندي — العيادات القريبة" },
      { name: "description", content: "شوف أقرب العيادات على الخريطة وقائمة بالأسعار والتقييمات." },
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
  useEffect(() => {
    let cancelled = false;
    getVerifiedClinics().then((list) => {
      if (!cancelled) setClinics(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = clinics;
    if (spec) list = list.filter((c) => c.specialtyId === spec);
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
  }, [clinics, spec, q, sort]);

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
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-muted-foreground">
            <ArrowDownAZ className="h-3 w-3" /> ترتيب:
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
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${
              spec === null ? "gradient-primary text-white" : "bg-secondary text-foreground"
            }`}
          >
            الكل
          </button>
          {specialties.map((s) => (
            <button
              key={s.id}
              onClick={() => setSpec(s.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${
                spec === s.id ? "gradient-primary text-white" : "bg-secondary text-foreground"
              }`}
            >
              {s.emoji} {s.name}
            </button>
          ))}
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
          <iframe
            title="خريطة العيادات"
            className="h-72 w-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=cairo%20egypt&t=&z=12&ie=UTF8&iwloc=&output=embed"
          />
          <div className="border-t border-border p-3 text-xs text-muted-foreground">
            الدبابيس الحمراء = عيادات قريبة منك
          </div>
        </div>
      )}

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
          return (
            <Link
              key={c.id}
              to="/patient/clinic/$id"
              params={{ id: c.id }}
              className="block rounded-2xl border border-border bg-card p-4 transition hover:shadow-soft"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-2xl">
                  {s?.emoji}
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
                        <Clock className="h-3 w-3" /> {c.distanceKm} كم
                      </span>
                    </div>
                    <span className="rounded-lg bg-primary-soft px-2 py-1 text-sm font-extrabold text-primary">
                      {c.price} ج
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}