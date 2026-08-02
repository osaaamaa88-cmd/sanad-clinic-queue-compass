import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Stethoscope,
  LogIn,
  Hourglass,
  X,
  BookOpen,
  Minus,
  Plus,
  Printer,
  Tv,
  RefreshCw,
  LogOut,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StaffAuth } from "@/components/StaffAuth";
import {
  getMyClinicMembership,
  signOutStaff,
  listBookingsForClinic,
  updateBookingStatus,
  addWalkIn,
  setClinicOps,
  clinicStatusLabels,
  getSpecialty,
  type ClinicStatus,
  type Booking,
  type Clinic,
} from "@/lib/mock-data";

const CACHE_PREFIX = "sandi.bookings.cache.v1.";

function readCache(clinicId: string): Booking[] {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + clinicId);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function writeCache(clinicId: string, rows: Booking[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + clinicId, JSON.stringify(rows));
  } catch {
    /* ignore quota errors */
  }
}

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

function Reception() {
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [rows, setRows] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [visitType, setVisitType] = useState<"new" | "followup">("new");

  const refresh = useCallback(async (clinicId: string) => {
    setRefreshing(true);
    const fresh = await listBookingsForClinic(clinicId);
    if (fresh.length > 0) {
      setRows(fresh);
      setFromCache(false);
      writeCache(clinicId, fresh);
    } else {
      const cached = readCache(clinicId);
      if (cached.length > 0) {
        // Network hiccup: keep the last known sheet instead of an empty screen.
        setRows(cached);
        setFromCache(true);
      } else {
        setRows([]);
        setFromCache(false);
      }
    }
    setRefreshing(false);
  }, []);

  const load = useCallback(async () => {
    const { clinic: c, role } = await getMyClinicMembership();
    setSignedIn(role !== null || Boolean(c));
    setClinic(c);
    if (c) {
      setRows(readCache(c.id));
      await refresh(c.id);
    }
    setLoaded(true);
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  const ops = async (patch: {
    nowServing?: number;
    clinicStatus?: ClinicStatus;
    delayMinutes?: number;
    bookingsClosed?: boolean;
  }) => {
    if (!clinic) return;
    const updated = await setClinicOps({ id: clinic.id, ...patch });
    if (updated) setClinic(updated);
  };

  const setStatus = async (b: Booking, status: Booking["status"]) => {
    if (!clinic) return;
    if (status === "cancelled" && !confirm(`إلغاء حجز ${b.patientName}؟`)) return;
    await updateBookingStatus(b.id, status);
    await refresh(clinic.id);
  };

  const addManual = async () => {
    if (!clinic || !name.trim()) return;
    await addWalkIn({
      clinicId: clinic.id,
      patientName: name.trim(),
      patientPhone: phone.trim(),
      visitType,
      slot: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    });
    setName("");
    setPhone("");
    setVisitType("new");
    setShowAdd(false);
    await refresh(clinic.id);
  };

  if (!loaded) {
    return (
      <AppShell title="دفتر الحجز" backTo="/">
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
        </div>
      </AppShell>
    );
  }

  if (!signedIn) {
    return (
      <AppShell title="دفتر الحجز" subtitle="دخول السكرتير أو الطبيب" backTo="/">
        <StaffAuth
          title="دخول فريق العيادة"
          hint="دفتر الحجز للسكرتير والطبيب فقط — المريض له الحجز والمتابعة فقط."
          onSignedIn={load}
          footer={
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              مفيش حساب؟ الطبيب هو اللي بينشئ حساب السكرتير من لوحة الطبيب.
            </p>
          }
        />
      </AppShell>
    );
  }

  if (!clinic) {
    return (
      <AppShell title="دفتر الحجز" backTo="/">
        <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-bold">لا توجد عيادة مربوطة بحسابك</p>
          <p className="mt-1 text-xs text-muted-foreground">
            من فضلك سجّل عيادتك من واجهة الطبيب أولاً، أو اطلب من الطبيب ربط حسابك بالعيادة.
          </p>
          <button
            onClick={async () => {
              await signOutStaff();
              setSignedIn(false);
            }}
            className="mt-4 w-full rounded-xl border border-border py-2.5 text-xs font-bold"
          >
            خروج
          </button>
        </div>
      </AppShell>
    );
  }

  const active = rows.filter((r) => r.status !== "cancelled");
  const waiting = active.filter((r) => r.status === "waiting").length;
  const inside = active.filter((r) => r.status === "in").length;
  const done = active.filter((r) => r.status === "done").length;
  const sheet = rows.slice().sort((a, b) => a.queueNumber - b.queueNumber);
  const closed = clinic?.bookingsClosed ?? false;
  const nowServing = clinic?.nowServing ?? 0;
  const spec = clinic ? getSpecialty(clinic.specialtyId) : undefined;

  return (
    <AppShell
      title="دفتر الحجز"
      subtitle={clinic ? `عيادة ${clinic.doctor}` : ""}
      backTo="/"
      right={
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => clinic && refresh(clinic.id)}
            aria-label="إعادة تحميل البيانات"
            title="إعادة تحميل البيانات"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={async () => {
              await signOutStaff();
              setSignedIn(false);
              setClinic(undefined);
            }}
            aria-label="خروج"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-secondary"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      }
    >
      {fromCache && (
        <p className="mb-3 rounded-xl bg-warning/15 px-3 py-2 text-center text-[11px] font-bold text-warning print:hidden">
          بنعرض آخر نسخة محفوظة من الدفتر — اضغط 🔄 لإعادة التحميل.
        </p>
      )}
      {/* Live queue number control */}
      <div className="rounded-2xl border-2 border-border bg-card p-4 print:hidden">
        <p className="text-center text-xs font-bold text-muted-foreground">رقم الدور الحالي المباشر</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            onClick={() => ops({ nowServing: Math.max(0, nowServing - 1) })}
            aria-label="نقصان رقم الدور"
            className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-secondary text-foreground"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="min-w-24 text-center text-5xl font-black text-primary">{nowServing}</div>
          <button
            onClick={() => ops({ nowServing: nowServing + 1 })}
            aria-label="زيادة رقم الدور"
            className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-white shadow-soft"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Clinic status */}
        <p className="mt-4 text-xs font-bold text-muted-foreground">حالة العيادة</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(["normal", "delayed", "paused"] as ClinicStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => ops({ clinicStatus: st, delayMinutes: st === "delayed" ? 15 : 0 })}
              className={`rounded-xl py-2 text-[11px] font-bold ${
                clinic?.clinicStatus === st
                  ? st === "normal"
                    ? "bg-success text-success-foreground"
                    : st === "delayed"
                      ? "bg-warning text-warning-foreground"
                      : "bg-destructive text-destructive-foreground"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {clinicStatusLabels[st].dot}{" "}
              {st === "delayed" ? "تأخير ١٥ دقيقة" : clinicStatusLabels[st].label}
            </button>
          ))}
        </div>

        {/* TV screen link */}
        {clinic && (
          <Link
            to="/tv/$id"
            params={{ id: clinic.id }}
            target="_blank"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-xs font-bold"
          >
            <Tv className="h-4 w-4 text-primary" /> افتح شاشة صالة الانتظار (TV)
          </Link>
        )}
      </div>

      {/* Top controls */}
      <div className="mt-3 grid grid-cols-2 gap-2 print:hidden">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-extrabold text-white shadow-soft"
        >
          <UserPlus className="h-4 w-4" /> إضافة مريض يدوي
        </button>
        <button
          onClick={() => ops({ bookingsClosed: !closed })}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold ${
            closed ? "bg-destructive text-destructive-foreground" : "border border-border bg-card text-foreground"
          }`}
        >
          {closed ? "الحجز مقفول اليوم" : "إيقاف استقبال الحجوزات"}
        </button>
      </div>
      {closed && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-center text-[11px] font-bold text-destructive print:hidden">
          استقبال الحجوزات موقوف لليوم — اضغط الزر تاني لفتحه.
        </p>
      )}
      <button
        onClick={() => window.print()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-extrabold print:hidden"
      >
        <Printer className="h-4 w-4 text-primary" /> طباعة جدول كشف اليوم
      </button>

      {showAdd && (
        <div className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 print:hidden">
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
          <div>
            <label className="text-xs font-bold text-muted-foreground">نوع الزيارة</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {([["new", "كشف جديد"], ["followup", "استشارة"]] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setVisitType(v)}
                  className={`rounded-xl py-2.5 text-xs font-bold ${
                    visitType === v ? "gradient-primary text-white" : "border border-border bg-card"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addManual}
            className="w-full rounded-xl bg-success py-3 font-bold text-success-foreground"
          >
            اكتبه في الدفتر
          </button>
        </div>
      )}

      {/* Counters */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center print:hidden">
        <Counter value={waiting} label="منتظر" />
        <Counter value={inside} label="جوه" />
        <Counter value={done} label="خلصوا" />
      </div>

      {/* Paper sheet */}
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b-2 border-border bg-secondary px-4 py-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <p className="text-sm font-extrabold">
            دفتر حجز النهارده {clinic ? `— ${clinic.doctor}${spec ? ` (${spec.name})` : ""}` : ""}
          </p>
          <span className="mr-auto text-[11px] text-muted-foreground">{sheet.length} سطر</span>
        </div>
        <div className="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem] gap-2 border-b border-border bg-secondary/60 px-3 py-2 text-[11px] font-bold text-muted-foreground">
          <span>الدور</span>
          <span>اسم المريض / الهاتف</span>
          <span>نوع الزيارة</span>
          <span>الحالة</span>
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
            <div className="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem] items-center gap-2">
              <span className="text-sm font-black text-muted-foreground">{r.queueNumber || i + 1}</span>
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-bold ${
                    r.status === "cancelled" ? "line-through" : ""
                  }`}
                >
                  {r.patientName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {r.patientPhone || "بدون رقم"} • {r.code} • {r.slot || "—"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${
                  r.visitType === "followup"
                    ? "bg-warning/20 text-warning"
                    : "bg-primary-soft text-primary"
                }`}
              >
                {r.visitType === "followup" ? "استشارة" : "كشف جديد"}
              </span>
              <span className="text-center text-[10px] font-bold text-muted-foreground">
                {r.status === "in"
                  ? "جوه"
                  : r.status === "done"
                    ? "خلص"
                    : r.status === "cancelled"
                      ? "ملغي"
                      : "منتظر"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 print:hidden">
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
                className="mt-1.5 w-full rounded-lg bg-success py-1.5 text-[11px] font-bold text-success-foreground print:hidden"
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
