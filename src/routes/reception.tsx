import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserPlus, Stethoscope, LogIn, Hourglass, X, BookOpen } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  getCurrentDoctorClinic,
  listBookingsForClinic,
  updateBookingStatus,
  createBooking,
  type Booking,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "دفتر الحجز — سندي" },
      { name: "description", content: "دفتر حجز العيادة: تسجيل المرضى وإدارة الدخول والانتظار." },
      { property: "og:title", content: "دفتر الحجز — سندي" },
      { property: "og:description", content: "إدارة حجوزات العيادة بشكل دفتر ورقي بسيط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reception,
});

const CLOSED_KEY = "sandi.bookingClosed.";

function Reception() {
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [rows, setRows] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [closed, setClosed] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const refresh = async (clinicId: string) => {
    setRows(await listBookingsForClinic(clinicId));
  };

  useEffect(() => {
    getCurrentDoctorClinic().then(async (c) => {
      setClinic(c);
      if (c) {
        await refresh(c.id);
        try {
          setClosed(localStorage.getItem(CLOSED_KEY + c.id) === "1");
        } catch { /* ignore */ }
      }
      setLoaded(true);
    });
  }, []);

  const toggleClosed = () => {
    if (!clinic) return;
    const v = !closed;
    setClosed(v);
    try {
      localStorage.setItem(CLOSED_KEY + clinic.id, v ? "1" : "0");
    } catch { /* ignore */ }
  };

  const setStatus = async (b: Booking, status: Booking["status"]) => {
    if (!clinic) return;
    if (status === "cancelled" && !confirm(`إلغاء حجز ${b.patientName}؟`)) return;
    await updateBookingStatus(b.id, status);
    await refresh(clinic.id);
  };

  const addWalkIn = async () => {
    if (!clinic || !name.trim()) return;
    await createBooking({
      clinicId: clinic.id,
      patientName: name.trim(),
      patientPhone: phone.trim(),
      dayLabel: "اليوم",
      slot: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    });
    setName("");
    setPhone("");
    setShowAdd(false);
    await refresh(clinic.id);
  };

  if (loaded && !clinic) {
    return (
      <AppShell title="دفتر الحجز" backTo="/">
        <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold">لا توجد عيادة مربوطة بالجهاز</p>
          <p className="mt-1 text-xs text-muted-foreground">
            من فضلك سجّل عيادتك من واجهة الطبيب أولاً ثم افتح دفتر الحجز.
          </p>
        </div>
      </AppShell>
    );
  }

  const active = rows.filter((r) => r.status !== "cancelled");
  const waiting = active.filter((r) => r.status === "waiting").length;
  const inside = active.filter((r) => r.status === "in").length;
  const done = active.filter((r) => r.status === "done").length;
  const sheet = rows.slice().sort((a, b) => a.queueNumber - b.queueNumber);

  return (
    <AppShell title="دفتر الحجز" subtitle={clinic ? `عيادة ${clinic.doctor}` : ""} backTo="/">
      {/* Top controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-extrabold text-white shadow-soft"
        >
          <UserPlus className="h-4 w-4" /> إضافة مريض يدوي
        </button>
        <button
          onClick={toggleClosed}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold ${
            closed ? "bg-destructive text-destructive-foreground" : "border border-border bg-card text-foreground"
          }`}
        >
          {closed ? "الحجز مقفول اليوم" : "إيقاف استقبال الحجوزات"}
        </button>
      </div>
      {closed && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] font-bold text-destructive">
          استقبال الحجوزات موقوف لليوم — اضغط الزر تاني لفتحه.
        </p>
      )}

      {showAdd && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground">اسم المريض</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد أحمد"
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">رقم الموبايل (اختياري)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              inputMode="tel"
              className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={addWalkIn}
            className="w-full rounded-xl bg-success py-3 font-bold text-success-foreground"
          >
            اكتبه في الدفتر
          </button>
        </div>
      )}

      {/* Counters */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Counter value={waiting} label="منتظر" />
        <Counter value={inside} label="جوه" />
        <Counter value={done} label="خلصوا" />
      </div>

      {/* Paper sheet */}
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b-2 border-border bg-secondary px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <p className="text-sm font-extrabold">دفتر حجز النهارده</p>
          <span className="mr-auto text-[11px] text-muted-foreground">{sheet.length} سطر</span>
        </div>
        <div className="grid grid-cols-[2.5rem_1fr_4.5rem] gap-2 border-b border-border bg-secondary/60 px-3 py-2 text-[11px] font-bold text-muted-foreground">
          <span>م</span>
          <span>اسم المريض / الهاتف</span>
          <span>الوقت</span>
        </div>

        {sheet.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            الدفتر فاضي — لسه محدش حجز النهارده.
          </p>
        )}

        {sheet.map((r, i) => (
          <div
            key={r.id}
            className={`border-b border-dashed border-border px-3 py-3 ${
              r.status === "in"
                ? "bg-primary-soft"
                : r.status === "cancelled"
                ? "opacity-50"
                : r.status === "done"
                ? "bg-secondary/40"
                : ""
            }`}
          >
            <div className="grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-2">
              <span className="text-sm font-black text-muted-foreground">{i + 1}</span>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-bold ${
                    r.status === "cancelled" ? "line-through" : ""
                  }`}
                >
                  {r.patientName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.patientPhone || "بدون رقم"} • {r.code}
                </p>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">{r.slot || "—"}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <SheetBtn
                active={r.status === "in"}
                onClick={() => setStatus(r, "in")}
                tone="primary"
                icon={LogIn}
                label="تم الدخول"
              />
              <SheetBtn
                active={r.status === "waiting"}
                onClick={() => setStatus(r, "waiting")}
                tone="warn"
                icon={Hourglass}
                label="انتظار"
              />
              <SheetBtn
                active={r.status === "cancelled"}
                onClick={() => setStatus(r, "cancelled")}
                tone="danger"
                icon={X}
                label="إلغاء"
              />
            </div>
            {r.status === "in" && (
              <button
                onClick={() => setStatus(r, "done")}
                className="mt-1.5 w-full rounded-lg bg-success py-1.5 text-[11px] font-bold text-success-foreground"
              >
                خلص الكشف ✓
              </button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card py-2">
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SheetBtn({
  active,
  onClick,
  tone,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  tone: "primary" | "warn" | "danger";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const activeCls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "warn"
      ? "bg-warning text-warning-foreground"
      : "bg-destructive text-destructive-foreground";
  const idleCls =
    tone === "primary"
      ? "border border-border bg-card text-primary"
      : tone === "warn"
      ? "border border-border bg-card text-warning"
      : "border border-border bg-card text-destructive";
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold ${
        active ? activeCls : idleCls
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
