import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Star, MessageCircle, Users, Check, Banknote } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getVerifiedClinic,
  getSpecialty,
  timeSlots,
  days,
  whatsappLink,
  createBooking,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/patient/clinic/$id")({
  head: () => ({
    meta: [
      { title: "تفاصيل العيادة — سندي" },
      { name: "description", content: "احجز موعدك في العيادة." },
    ],
  }),
  component: ClinicDetail,
});

function ClinicDetail() {
  const { id } = useParams({ from: "/patient/clinic/$id" });
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getVerifiedClinic(id).then((c) => {
      if (cancelled) return;
      setClinic(c);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [bookingCode, setBookingCode] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const confirmBooking = async () => {
    if (!clinic || !slot || submitting) return;
    setSubmitting(true);
    const b = await createBooking({
      clinicId: clinic.id,
      patientName: "مريض سندي",
      patientPhone: "",
      dayLabel: `${days[dayIdx].label} — ${days[dayIdx].date}`,
      slot,
    });
    setSubmitting(false);
    if (b) {
      setBookingCode(b.code);
      setBooked(true);
    }
  };

  if (!loaded) return <AppShell title="جاري التحميل…" backTo="/patient/search"><div /></AppShell>;
  if (!clinic || !clinic.isVerified) {
    return (
      <AppShell title="عيادة غير متاحة" backTo="/patient/search">
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          العيادة دي مش موجودة أو لسه ما تمّش توثيقها.
        </div>
      </AppShell>
    );
  }
  const spec = getSpecialty(clinic.specialtyId);

  if (booked) {
    const msg = `أهلاً، حجزت عند ${clinic.doctor} يوم ${days[dayIdx].date} الساعة ${slot}.\nكود الحجز: ${bookingCode}\nالدفع نقداً في العيادة.\nالعنوان: ${clinic.address} — ${clinic.area}.`;
    return (
      <AppShell title="تم الحجز" backTo="/patient" tone="primary">
        <div className="-mt-6 rounded-3xl bg-card p-6 text-center shadow-soft">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success text-success-foreground">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-extrabold">تم تأكيد حجزك 🎉</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            احتفظ بكود الحجز واعرضه في العيادة
          </p>
          <div className="mt-4 rounded-2xl border-2 border-dashed border-primary bg-primary-soft p-4 text-center">
            <p className="text-xs font-bold text-primary">كود الحجز</p>
            <p className="mt-1 text-2xl font-extrabold tracking-widest text-primary">{bookingCode}</p>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-right">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/20 text-success">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">الدفع نقداً في العيادة</p>
              <p className="text-xs text-muted-foreground">مفيش أي رسوم على الحجز عبر سندي</p>
            </div>
          </div>
          <div className="mt-5 space-y-2 rounded-2xl bg-secondary p-4 text-right">
            <Row label="كود الحجز" value={bookingCode} />
            <Row label="الطبيب" value={clinic.doctor} />
            <Row label="التخصص" value={spec?.name ?? ""} />
            <Row label="اليوم" value={`${days[dayIdx].label} — ${days[dayIdx].date}`} />
            <Row label="الساعة" value={slot ?? ""} />
            <Row label="العنوان" value={`${clinic.address} — ${clinic.area}`} />
            <Row label="سعر الكشف" value={`${clinic.price} جنيه — يُدفع نقداً`} />
          </div>
          <a
            href={whatsappLink(clinic.phone, msg)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-base font-extrabold text-success-foreground"
          >
            <MessageCircle className="h-5 w-5" /> تواصل مع العيادة على واتساب
          </a>
          <Link
            to="/patient/queue/$id"
            params={{ id: clinic.id }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft"
          >
            <Users className="h-5 w-5" /> شوف دورك في العيادة
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={clinic.doctor} subtitle={spec?.name} backTo="/patient/search">
      {/* Header card */}
      <div className="rounded-3xl gradient-primary p-5 text-white shadow-soft">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl">
            {spec?.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold">{clinic.doctor}</h2>
            <p className="text-sm opacity-90">{spec?.name}</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" /> {clinic.rating} ({clinic.reviews})
              </span>
              <span>•</span>
              <span>{clinic.distanceKm} كم</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/15 p-3">
          <div>
            <p className="text-xs opacity-80">سعر الكشف</p>
            <p className="text-lg font-extrabold">{clinic.price} جنيه</p>
          </div>
          {clinic.availableNow ? (
            <span className="rounded-full bg-success px-3 py-1 text-xs font-bold text-success-foreground">
              مفتوح دلوقتي
            </span>
          ) : (
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold">مغلق</span>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">العنوان</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{clinic.address}</p>
            <p className="text-sm text-muted-foreground">{clinic.area}</p>
          </div>
        </div>
        <iframe
          title="خريطة العيادة"
          className="mt-3 h-40 w-full rounded-xl border border-border"
          loading="lazy"
          src={`https://maps.google.com/maps?q=${clinic.lat},${clinic.lng}&z=15&output=embed`}
        />
      </div>

      {/* Day picker */}
      <div className="mt-6">
        <h3 className="text-base font-bold">اختار اليوم</h3>
        <div className="-mx-5 mt-3 overflow-x-auto px-5">
          <div className="flex gap-2">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => setDayIdx(i)}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-center ${
                  dayIdx === i
                    ? "gradient-primary border-transparent text-white shadow-soft"
                    : "border-border bg-card text-foreground"
                }`}
              >
                <div className="text-xs opacity-80">{d.label}</div>
                <div className="mt-0.5 text-sm font-bold">{d.date}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Time picker */}
      <div className="mt-6">
        <h3 className="text-base font-bold">اختار الساعة</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {timeSlots.map((t) => (
            <button
              key={t}
              onClick={() => setSlot(t)}
              className={`rounded-xl border py-2.5 text-sm font-bold ${
                slot === t
                  ? "gradient-primary border-transparent text-white"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-card/95 p-4 backdrop-blur">
        <button
          disabled={!slot || submitting}
          onClick={confirmBooking}
          className="w-full rounded-2xl gradient-primary py-4 text-base font-extrabold text-white shadow-soft disabled:opacity-50"
        >
          {submitting ? "جاري الحفظ…" : slot ? `أكد الحجز — ${slot}` : "اختار الساعة الأول"}
        </button>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-left font-bold">{value}</span>
    </div>
  );
}