import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listHospitals, hospitalMapsUrl, type Hospital } from "@/lib/hospitals.functions";

const TYPES: Record<string, string> = {
  university: "جامعي",
  moh: "وزارة الصحة",
  teaching: "تعليمي",
  health_insurance: "تأمين صحي",
  specialized: "تخصصي",
};

export const Route = createFileRoute("/hospitals")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "دليل المستشفيات الحكومية | سَنَد SANAD" },
      { name: "description", content: "أقرب مستشفى حكومي أو جامعي في كل محافظات مصر مع رقم الاتصال والموقع على الخريطة." },
      { property: "og:title", content: "دليل المستشفيات الحكومية | سَنَد" },
      { property: "og:description", content: "ابحث عن أقرب مستشفى حكومي واتصل به أو افتح موقعه فورًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listHospitals(),
  errorComponent: () => <div className="p-6 text-center">تعذر تحميل المستشفيات، حاول مرة أخرى.</div>,
  notFoundComponent: () => <div className="p-6 text-center">الصفحة غير موجودة</div>,
  component: HospitalsPage,
});

function km(a: [number, number], b: [number, number]) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function HospitalsPage() {
  const hospitals = Route.useLoaderData() as Hospital[];
  const [q, setQ] = useState("");
  const [gov, setGov] = useState("");
  const [type, setType] = useState("");
  const [me, setMe] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setMe([p.coords.latitude, p.coords.longitude]),
      () => {},
      { timeout: 8000 },
    );
  }, []);

  const govs = useMemo(() => [...new Set(hospitals.map((h) => h.governorate))], [hospitals]);

  const list = useMemo(() => {
    const t = q.trim();
    return hospitals
      .filter((h) => (!gov || h.governorate === gov) && (!type || h.hospital_type === type))
      .filter((h) => !t || h.name.includes(t) || h.district.includes(t) || h.governorate.includes(t))
      .map((h) => ({ ...h, dist: me ? km(me, [Number(h.lat), Number(h.lng)]) : null }))
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  }, [hospitals, q, gov, type, me]);

  return (
    <div dir="rtl" className="mx-auto max-w-2xl p-4 pb-28">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">المستشفيات الحكومية</h1>
        <Link to="/patient/emergency" className="text-sm text-primary">الطوارئ ←</Link>
      </div>

      <a href="tel:123" className="mb-3 flex items-center justify-center rounded-xl bg-destructive p-3 font-bold text-destructive-foreground">
        🚑 اتصل بالإسعاف 123
      </a>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث باسم المستشفى أو الحي…"
        className="mb-3 w-full rounded-xl border bg-card p-3"
      />

      <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
        <Chip active={!gov} onClick={() => setGov("")}>كل المحافظات</Chip>
        {govs.map((g) => <Chip key={g} active={gov === g} onClick={() => setGov(g)}>{g}</Chip>)}
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Chip active={!type} onClick={() => setType("")}>كل الأنواع</Chip>
        {Object.entries(TYPES).map(([k, v]) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{v}</Chip>)}
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {me ? "مرتبة من الأقرب لموقعك" : "فعّل الموقع لترتيب المستشفيات حسب الأقرب"} · {list.length} مستشفى
      </p>

      <div className="space-y-3">
        {list.map((h) => (
          <article key={h.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <Link to="/hospital/$id" params={{ id: h.id }} className="font-bold">{h.name}</Link>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{TYPES[h.hospital_type] ?? h.hospital_type}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">📍 {h.governorate} – {h.address}</p>
            {h.dist != null && <p className="text-xs text-muted-foreground">يبعد {h.dist.toFixed(1)} كم</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {h.emergency_24h && <Badge>طوارئ 24 ساعة</Badge>}
              {h.has_icu && <Badge>رعاية مركزة</Badge>}
              {h.has_nicu && <Badge>حضانات</Badge>}
              {h.location_verified ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">✓ موقع مؤكد</span> : <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs text-warning">📍 موقع تقريبي</span>}
              {h.departments.map((d) => <span key={d} className="rounded-full bg-muted px-2 py-0.5 text-xs">{d}</span>)}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:${h.emergency_phone || h.phone}`} className="rounded-xl bg-primary p-2 text-center text-sm font-bold text-primary-foreground">📞 اتصال</a>
              <a
                href={hospitalMapsUrl(h)}
                target="_blank" rel="noreferrer"
                className="rounded-xl border p-2 text-center text-sm font-bold"
              >🗺️ فتح في خرائط جوجل</a>
            </div>
          </article>
        ))}
        {list.length === 0 && <p className="py-10 text-center text-muted-foreground">مفيش نتائج</p>}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      {children}
    </button>
  );
}
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">{children}</span>;
}
