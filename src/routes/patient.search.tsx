import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Map as MapIcon, List, MapPin, Star, Clock, Stethoscope } from "lucide-react";
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
  useEffect(() => {
    const refresh = () => setClinics(getVerifiedClinics());
    refresh();
    window.addEventListener("tabibak:clinics-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("tabibak:clinics-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const filtered = spec ? clinics.filter((c) => c.specialtyId === spec) : clinics;

  return (
    <AppShell title="العيادات القريبة" subtitle={`${filtered.length} عيادة حواليك`} backTo="/patient">
      {/* Specialty chips */}
      <div className="-mx-5 overflow-x-auto px-5 pb-1">
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