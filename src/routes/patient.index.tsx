import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search, Bell, Clock, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { specialties, clinics } from "@/lib/mock-data";

export const Route = createFileRoute("/patient/")({
  head: () => ({
    meta: [
      { title: "طبيبك — الصفحة الرئيسية للمريض" },
      { name: "description", content: "دور على طبيب من التخصصات القريبة منك واحجز فوراً." },
    ],
  }),
  component: PatientHome,
});

function PatientHome() {
  const active = clinics.filter((c) => c.availableNow).slice(0, 2);
  return (
    <AppShell
      title="أهلاً بيك 👋"
      subtitle="اختار التخصص وابدأ البحث"
      tone="primary"
      right={
        <button className="grid h-10 w-10 place-items-center rounded-full bg-white/20" aria-label="إشعارات">
          <Bell className="h-5 w-5" />
        </button>
      }
    >
      {/* Location card */}
      <div className="-mt-10 rounded-2xl bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">موقعك الحالي</p>
            <p className="truncate text-sm font-bold">المهندسين، الجيزة</p>
          </div>
          <button className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold">تغيير</button>
        </div>
      </div>

      {/* Search */}
      <Link
        to="/patient/search"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">دور على طبيب أو عيادة…</span>
      </Link>

      {/* Specialties */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold">التخصصات</h2>
        <Link to="/patient/search" className="text-xs text-primary">شوف الكل</Link>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {specialties.slice(0, 8).map((s) => (
          <Link
            key={s.id}
            to="/patient/search"
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center transition hover:shadow-soft"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-2xl">
              {s.emoji}
            </div>
            <span className="text-xs font-semibold">{s.name}</span>
          </Link>
        ))}
      </div>

      {/* Available now */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-bold">متاح دلوقتي</h2>
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
          {active.length} عيادة
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {active.map((c) => (
          <Link
            key={c.id}
            to="/patient/clinic/$id"
            params={{ id: c.id }}
            className="block rounded-2xl border border-border bg-card p-4 transition hover:shadow-soft"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-xl">
                {specialties.find((s) => s.id === c.specialtyId)?.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-bold">{c.doctor}</p>
                  <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground">
                    متاح
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.area} • {c.distanceKm} كم</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {c.rating}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{c.waitingCount * 10} د</span>
                  <span className="font-bold text-foreground">{c.price} ج</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}