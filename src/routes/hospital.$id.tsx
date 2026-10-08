import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Phone, Navigation, MapPin, ChevronRight } from "lucide-react";
import { getHospital, hospitalMapsUrl, HOSPITAL_TYPES } from "@/lib/hospitals.functions";

export const Route = createFileRoute("/hospital/$id")({
  loader: async ({ params }) => {
    const h = await getHospital({ data: { id: params.id } });
    if (!h) throw notFound();
    return h;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "مستشفى حكومي"} | سَنَد` },
      { name: "description", content: `رقم وموقع ${loaderData?.name ?? "المستشفى"} في ${loaderData?.governorate ?? "مصر"} والأقسام المتاحة.` },
      { property: "og:title", content: `${loaderData?.name ?? "مستشفى حكومي"} | سَنَد` },
      { property: "og:description", content: "اتصل بالمستشفى أو افتح موقعه على الخريطة فورًا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => <div className="p-6 text-center">تعذر تحميل بيانات المستشفى.</div>,
  notFoundComponent: () => <div className="p-6 text-center">المستشفى غير موجود</div>,
  component: HospitalPage,
});

function HospitalPage() {
  const h = Route.useLoaderData();
  const phone = h.emergency_phone || h.phone || "123";
  return (
    <div dir="rtl" className="mx-auto max-w-xl p-4 pb-28">
      <Link to="/patient/search" className="mb-3 inline-flex items-center gap-1 text-sm text-primary">
        <ChevronRight className="h-4 w-4" /> رجوع للبحث
      </Link>
      <div className="rounded-3xl border bg-card p-5">
        <div className="text-4xl">🏥</div>
        <h1 className="mt-2 text-xl font-extrabold">{h.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
            مستشفى حكومي · {HOSPITAL_TYPES[h.hospital_type] ?? h.hospital_type}
          </span>
          {h.location_verified ? (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">✓ موقع مؤكد</span>
          ) : (
            <span className="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs font-bold text-warning">📍 موقع تقريبي</span>
          )}
        </div>
        <p className="mt-3 flex items-start gap-1 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {h.governorate}{h.district ? ` – ${h.district}` : ""}{h.address ? ` – ${h.address}` : ""}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${phone}`} className="flex items-center justify-center gap-1.5 rounded-2xl bg-destructive py-3.5 font-extrabold text-destructive-foreground">
            <Phone className="h-4 w-4" /> اتصال {phone === "123" ? "(الإسعاف)" : ""}
          </a>
          <a href={hospitalMapsUrl(h)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-2xl bg-secondary py-3.5 font-bold">
            <Navigation className="h-4 w-4" /> الاتجاهات
          </a>
        </div>
      </div>

      <section className="mt-4 rounded-3xl border bg-card p-5">
        <h2 className="font-bold">الأقسام المتاحة</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {h.emergency_24h && <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">طوارئ 24 ساعة</span>}
          {h.has_icu && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">رعاية مركزة</span>}
          {h.has_nicu && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">حضانات</span>}
          {h.departments.map((d) => <span key={d} className="rounded-full bg-secondary px-2 py-0.5 text-xs">{d}</span>)}
        </div>
      </section>

      <section className="mt-4 rounded-3xl border bg-card p-5 text-sm leading-7 text-muted-foreground">
        <h2 className="mb-1 font-bold text-foreground">إرشادات قبل الذهاب</h2>
        <p>• الاستقبال والطوارئ يعملان طوال اليوم، والعيادات الخارجية عادةً صباحًا.</p>
        <p>• خُد معاك بطاقة الرقم القومي وأي تقارير أو أدوية سابقة.</p>
        <p>• يُفضَّل الاتصال قبل الذهاب للتأكد من توفر القسم المطلوب.</p>
        <p>• في الحالات الخطيرة اتصل بالإسعاف 123 فورًا.</p>
      </section>
    </div>
  );
}
