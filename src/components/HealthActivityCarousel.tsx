import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, HeartPulse, Sparkles } from "lucide-react";
import { getSavedBookings, type SavedBooking } from "@/lib/patient-session";
import {
  bpStatus,
  parseReadings,
  READINGS_KEY,
  sugarStatus,
  type HealthSnapshot,
  type OrganStatus,
} from "@/lib/organ-insights";

const TIPS = [
  "اشرب 8 أكواب مية في اليوم، حتى في الشتا جسمك محتاجها.",
  "قيس ضغطك في نفس الميعاد كل يوم عشان القراءة تبقى أدق.",
  "مشي ربع ساعة بعد الأكل بيساعد على ضبط السكر.",
  "نام 7 ساعات على الأقل، النوم علاج لنص المشاكل.",
];

const statusStyle: Record<OrganStatus, { label: string; cls: string }> = {
  normal: { label: "طبيعي", cls: "bg-success/15 text-success" },
  watch: { label: "تابعه", cls: "bg-warning/15 text-warning" },
  alert: { label: "تنبيه", cls: "bg-destructive/15 text-destructive" },
  unknown: { label: "مفيش قراءة", cls: "bg-muted text-muted-foreground" },
};

const card =
  "w-[78%] max-w-[280px] shrink-0 snap-start rounded-2xl border border-border/50 bg-card/80 p-4 text-right shadow-soft backdrop-blur-xl transition active:scale-[0.98]";

export function HealthActivityCarousel() {
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [snap, setSnap] = useState<HealthSnapshot>({});
  const [tip, setTip] = useState(TIPS[0]);

  useEffect(() => {
    setBooking(getSavedBookings()[0] ?? null);
    setSnap(parseReadings(window.localStorage.getItem(READINGS_KEY)));
    setTip(TIPS[new Date().getDate() % TIPS.length]);
  }, []);

  const bp = bpStatus(snap.bp);
  const sugar = sugarStatus(snap.sugar);

  return (
    <section className="mt-5" aria-label="نشاطك الصحي">
      <h2 className="mb-2 text-lg font-extrabold">نشاطك الصحي</h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {booking ? (
          <Link to="/patient/clinic/$id" params={{ id: booking.clinicId }} className={card}>
            <CalendarClock className="mb-2 h-5 w-5 text-primary" />
            <span className="block text-xs text-muted-foreground">حجز محفوظ</span>
            <span className="block truncate text-sm font-bold">{booking.clinicName}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {booking.dayLabel} · {booking.slot}
              {booking.queueNumber ? ` · دورك #${booking.queueNumber}` : ""}
            </span>
          </Link>
        ) : (
          <Link to="/patient/search" className={card}>
            <CalendarClock className="mb-2 h-5 w-5 text-primary" />
            <span className="block text-sm font-bold">مفيش حجز قادم</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              دوّر على عيادة واحجز دورك
            </span>
          </Link>
        )}

        <Link to="/patient/health" className={card}>
          <HeartPulse className="mb-2 h-5 w-5 text-primary" />
          <span className="block text-xs text-muted-foreground">آخر قياساتك</span>
          <span className="mt-1 flex items-center justify-between gap-2 text-sm font-bold">
            الضغط {snap.bp ? `${snap.bp.sys}/${snap.bp.dia}` : "—"}
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[bp].cls}`}>
              {statusStyle[bp].label}
            </span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-2 text-sm font-bold">
            السكر {snap.sugar ? snap.sugar.value : "—"}
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusStyle[sugar].cls}`}>
              {statusStyle[sugar].label}
            </span>
          </span>
        </Link>

        <Link to="/patient/assistant" className={card}>
          <Sparkles className="mb-2 h-5 w-5 text-primary" />
          <span className="block text-xs text-muted-foreground">نصيحة نيمو النهارده</span>
          <span className="mt-1 block text-sm font-bold leading-relaxed">{tip}</span>
        </Link>
      </div>
    </section>
  );
}
