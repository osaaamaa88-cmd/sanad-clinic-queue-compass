import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserPlus, Clock, Check, Phone, Stethoscope } from "lucide-react";
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
  head: () => ({ meta: [{ title: "سندي — لوحة السكرتير" }] }),
  component: Reception,
});

function Reception() {
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [rows, setRows] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const refresh = async (clinicId: string) => {
    const list = await listBookingsForClinic(clinicId);
    setRows(list);
  };

  useEffect(() => {
    getCurrentDoctorClinic().then(async (c) => {
      setClinic(c);
      if (c) await refresh(c.id);
      setLoaded(true);
    });
  }, []);

  const current = rows.find((r) => r.status === "in");
  const done = rows.filter((r) => r.status === "done").length;
  const waiting = rows.filter((r) => r.status === "waiting").length;

  const next = async () => {
    if (!clinic) return;
    const inRow = rows.find((r) => r.status === "in");
    if (inRow) await updateBookingStatus(inRow.id, "done");
    const nextRow = rows.find((r) => r.status === "waiting");
    if (nextRow) await updateBookingStatus(nextRow.id, "in");
    await refresh(clinic.id);
  };

  const addWalkIn = async () => {
    if (!clinic || !name.trim()) return;
    await createBooking({
      clinicId: clinic.id,
      patientName: name.trim(),
      patientPhone: phone.trim(),
      dayLabel: "اليوم",
      slot: "الآن",
    });
    setName("");
    setPhone("");
    setShowAdd(false);
    await refresh(clinic.id);
  };

  if (loaded && !clinic) {
    return (
      <AppShell title="لوحة السكرتير" backTo="/">
        <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold">لا توجد عيادة مربوطة بالجهاز</p>
          <p className="mt-1 text-xs text-muted-foreground">
            من فضلك سجّل عيادتك من واجهة الطبيب أولاً ثم افتح لوحة السكرتير.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة السكرتير" subtitle={clinic ? `عيادة ${clinic.doctor}` : ""} backTo="/">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox value={String(current?.queueNumber ?? "—")} label="النمرة دلوقتي" tone="primary" />
        <StatBox value={String(waiting)} label="في الانتظار" />
        <StatBox value={String(done)} label="خلصوا" />
      </div>

      {/* Big Next button */}
      <button
        onClick={next}
        disabled={waiting === 0}
        className="mt-5 w-full rounded-3xl gradient-primary py-8 text-2xl font-black text-white shadow-soft transition active:scale-[0.98] disabled:opacity-50"
      >
        دخول المريض التالي →
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        اضغط لما يدخل مريض جديد لعند الدكتور
      </p>

      {/* Current */}
      {current && (
        <div className="mt-5 rounded-2xl border-2 border-primary bg-primary-soft p-4">
          <p className="text-xs font-bold text-primary">جوه دلوقتي</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">
              {current.queueNumber}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{current.patientName}</p>
              <p className="text-xs text-muted-foreground">{current.patientPhone || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add walk-in */}
      <button
        onClick={() => setShowAdd((v) => !v)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card py-4 text-sm font-bold text-primary"
      >
        <UserPlus className="h-5 w-5" /> إضافة مريض جه من غير حجز
      </button>

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
            أضف للطابور
          </button>
        </div>
      )}

      {/* Queue list */}
      <h2 className="mt-6 text-base font-bold">حجوزات النهارده</h2>
      <div className="mt-3 space-y-2">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            لا توجد حجوزات لسه. لما مريض يحجز، هيظهر هنا فوراً.
          </div>
        )}
        {rows.slice().reverse().map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              r.status === "in" ? "border-primary bg-primary-soft" : "border-border bg-card"
            }`}
          >
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-black ${
              r.status === "in"
                ? "bg-primary text-primary-foreground"
                : r.status === "done"
                ? "bg-secondary text-muted-foreground"
                : "bg-warning/20 text-foreground"
            }`}>
              {r.queueNumber}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">{r.patientName}</p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{r.code}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {r.slot || "—"} • <Phone className="h-3 w-3" /> {r.patientPhone || "—"}
              </div>
            </div>
            {r.status === "done" && <Check className="h-4 w-4 text-success" />}
            {r.status === "waiting" && <span className="text-xs font-bold text-warning">منتظر</span>}
            {r.status === "in" && <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">جوه</span>}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function StatBox({ value, label, tone }: { value: string; label: string; tone?: "primary" }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${
      tone === "primary" ? "gradient-primary text-white shadow-soft" : "bg-card border border-border"
    }`}>
      <div className="text-2xl font-black">{value}</div>
      <div className={`text-[11px] ${tone === "primary" ? "opacity-90" : "text-muted-foreground"}`}>{label}</div>
    </div>
  );
}