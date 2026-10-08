import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Map as MapIcon, List, MapPin, Star, Stethoscope, Search as SearchIcon, X, ArrowUpDown, BadgeCheck, Users, ChevronLeft, Navigation, LayoutGrid, Route as RouteIcon, Phone, MessageCircle } from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { AppShell } from "@/components/AppShell";
import { ClinicsMap } from "@/components/ClinicsMap";
import { getVerifiedClinics, specialties, getSpecialty, whatsappLink, type Clinic } from "@/lib/mock-data";
import { getPatientLocation } from "@/lib/patient-location";
import { listHospitals, HOSPITAL_TYPES, type Hospital } from "@/lib/hospitals.functions";

function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

function hospitalToClinic(h: Hospital, pos: { lat: number; lng: number }): Clinic {
  const lat = Number(h.lat), lng = Number(h.lng);
  return {
    id: h.id, doctor: h.name, specialtyId: "emergency", address: h.address || h.district, area: h.governorate,
    distanceKm: kmBetween(pos, { lat, lng }), price: 0, rating: 0, reviews: 0, availableNow: h.emergency_24h,
    phone: h.emergency_phone || h.phone || "123", nowServing: 0, yourNumber: 0, waitingCount: 0, lat, lng,
    isVerified: true, submittedAt: 0, updatedAt: 0, clinicStatus: "normal", delayMinutes: 0, bookingsClosed: false,
    kind: "hospital", approxLocation: !h.location_verified, hospitalType: h.hospital_type,
  };
}

export const Route = createFileRoute("/patient/search")({
  staticData: { sitemap: true },
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
  const [view, setView] = useState<"list" | "map">("map");
  const [spec, setSpec] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const kind = "all" as "all" | "clinic" | "hospital";
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
    listHospitals().then((rows) => {
      if (!cancelled) setHospitals(rows);
    }).catch(() => {});
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
    const hosp = hospitals.map((h) => hospitalToClinic(h, pos));
    let list = kind === "clinic" ? clinics : kind === "hospital" ? hosp : [...clinics, ...hosp];
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
  }, [clinics, hospitals, pos, kind, spec, q, sort, openNow]);

  return (
    <AppShell title="العيادات القريبة" subtitle={`${filtered.length} نتيجة حواليك`} backTo="/patient">
      <Link to="/find-doctor" className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3">
        <SearchIcon className="h-5 w-5 text-primary" />
        <span className="flex-1 text-sm font-bold">ابحث عن طبيب باسمه</span>
        <ChevronLeft className="h-4 w-4 text-primary" />
      </Link>
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
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
          if (c.kind === "hospital") return <HospitalCard key={c.id} c={c} />;
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
                        <RouteIcon className="h-3 w-3" /> {c.distanceKm} كم
                      </span>
                    </div>
                    <span className="rounded-lg bg-primary-soft px-2 py-1 text-sm font-extrabold text-primary">
                      {c.price} ج
                    </span>
                  </div>
                  <span className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl gradient-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-soft">
                    عرض الطبيب والتواصل <ChevronLeft className="h-4 w-4" />
                  </span>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground">الحجز أونلاين قريباً ⏳</p>
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

function Crescent({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M15 4 A8 8 0 1 0 15 20 A6.4 6.4 0 1 1 15 4 Z" fill="currentColor" />
    </svg>
  );
}

function HospitalCard({ c }: { c: Clinic }) {
  const dest = c.approxLocation ? encodeURIComponent(`${c.doctor} ${c.area}`) : `${c.lat},${c.lng}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:border-destructive/40">
      <Link to="/hospital/$id" params={{ id: c.id }} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-destructive to-destructive/70 text-destructive-foreground shadow-soft">
            <Crescent className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-extrabold leading-snug">{c.doctor}</p>
            <p className="mt-0.5 text-xs font-semibold text-destructive">مستشفى حكومي · {HOSPITAL_TYPES[c.hospitalType ?? ""] ?? "حكومي"}</p>
            <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{c.area} — {c.address}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold"><RouteIcon className="h-3 w-3" /> {c.distanceKm} كم</span>
              {c.availableNow && <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">طوارئ 24 ساعة</span>}
              <LocationBadge approx={!!c.approxLocation} />
            </div>
          </div>
          <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
      <div className="grid grid-cols-2 border-t border-border">
        <a href={`tel:${c.phone}`} className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-extrabold text-destructive hover:bg-destructive/5"><Phone className="h-3.5 w-3.5" /> اتصال</a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 border-r border-border py-2.5 text-xs font-bold hover:bg-secondary"><Navigation className="h-3.5 w-3.5" /> الاتجاهات</a>
      </div>
    </div>
  );
}

function LocationBadge({ approx }: { approx: boolean }) {
  return approx ? (
    <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-[10px] font-bold text-warning">📍 موقع تقريبي</span>
  ) : (
    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">✓ موقع مؤكد</span>
  );
}

function HospitalSheet({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  return (
    <>
      <button onClick={onClose} aria-label="إغلاق البطاقة" className="fixed inset-0 z-[90] bg-black/40" />
      <div className="fixed inset-x-0 bottom-0 z-[95] mx-auto w-full max-w-md sm:max-w-xl">
        <div className="animate-sheet-up relative rounded-t-3xl border-t border-border bg-card p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <button onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground"><X className="h-4 w-4" /></button>
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
          <p className="font-extrabold">🏥 {clinic.doctor}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">مستشفى حكومي</span>
            <LocationBadge approx={!!clinic.approxLocation} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{clinic.area} — {clinic.address} • {clinic.distanceKm} كم</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${clinic.phone}`} className="flex items-center justify-center gap-1.5 rounded-2xl bg-destructive py-3.5 text-sm font-extrabold text-destructive-foreground"><Phone className="h-4 w-4" /> اتصال</a>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.approxLocation ? encodeURIComponent(`${clinic.doctor} ${clinic.area}`) : `${clinic.lat},${clinic.lng}`}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3.5 text-sm font-bold"><Navigation className="h-4 w-4" /> الاتجاهات</a>
          </div>
          <Link to="/hospital/$id" params={{ id: clinic.id }} className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-border py-3 text-sm font-bold">تفاصيل المستشفى <ChevronLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </>
  );
}

function ClinicSheet({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  if (clinic.kind === "hospital") return <HospitalSheet clinic={clinic} onClose={onClose} />;
  const s = getSpecialty(clinic.specialtyId);
  const SpecIcon = (s && specialtyIcons[s.id]) || Stethoscope;
  return (
    <>
      <button
        onClick={onClose}
        aria-label="إغلاق البطاقة"
        className="fixed inset-0 z-[90] bg-black/40 transition-opacity"
      />
      <div className="fixed inset-x-0 bottom-0 z-[95] mx-auto w-full max-w-md sm:max-w-xl">
      <div className="animate-sheet-up relative rounded-t-3xl border-t border-border bg-card p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,.45)] sm:p-5">
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
        <div className="mt-4 grid grid-cols-3 gap-2">
          <a
            href={clinic.phone ? `tel:${clinic.phone}` : undefined}
            className="flex items-center justify-center gap-1.5 rounded-2xl gradient-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-soft"
          >
            <Phone className="h-4 w-4" /> اتصال
          </a>
          <a
            href={clinic.phone ? whatsappLink(clinic.phone, `أهلاً، عايز أستفسر عن مواعيد ${clinic.doctor}.`) : undefined}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3.5 text-sm font-bold"
          >
            <MessageCircle className="h-4 w-4 text-success" /> واتساب
          </a>
          {clinic.lat && clinic.lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.lat},${clinic.lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3.5 text-sm font-bold"
            >
              <Navigation className="h-4 w-4" /> الاتجاهات
            </a>
          ) : <span className="rounded-2xl bg-secondary" />}
        </div>
        <Link
          to="/patient/clinic/$id"
          params={{ id: clinic.id }}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-2xl border border-border py-3 text-sm font-bold"
        >
          عرض بروفايل الطبيب <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">الحجز أونلاين قريباً ⏳</p>
      </div>
    </div>
    </>
  );
}