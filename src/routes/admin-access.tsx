import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  TrendingUp,
  Users,
  Building2,
  Calendar,
  ShieldCheck,
  BadgeCheck,
  Lock,
  Search,
  Download,
  Pause,
  Play,
  Pencil,
  BarChart3,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { UsersTab, LiveBookingsTab, MediaTab, SystemTab } from "@/components/admin/GodModePanel";
import { godSetFeatured } from "@/lib/godmode.functions";
import { specialties, getSpecialty, type Clinic } from "@/lib/mock-data";
import {
  adminListClinics,
  adminVerifyClinic,
  adminDeleteClinic,
  adminStats,
  adminToggleDisableClinic,
  adminSetVerified,
  adminEditClinic,
  adminListBookings,
  adminAnalytics,
} from "@/lib/admin.functions";
import { checkAdminUnlocked, unlockAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin-access")({
  head: () => ({ meta: [{ title: "سَنَد — لوحة الأدمن" }] }),
  component: Admin,
});

type ClinicRow = Clinic & { isDisabled: boolean; isFeatured?: boolean };
type BookingRow = {
  id: string;
  code: string;
  clinic_id: string;
  patient_name: string;
  patient_phone: string;
  day_label: string;
  slot: string;
  queue_number: number;
  status: string;
  created_at: string;
};
type Analytics = {
  totalBookings: number;
  totalClinics: number;
  pendingClinics: number;
  verifiedClinics: number;
  disabledClinics: number;
  topClinics: { id: string; count: number; doctor: string; specialtyId: string }[];
  topSpecialties: { specialtyId: string; count: number }[];
};

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const unlock = useServerFn(unlockAdmin);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) onUnlock();
      else setError("كلمة السر غير صحيحة، غير مصرح لك بالدخول");
    } catch {
      setError("حصل خطأ أثناء التحقق. حاول تاني.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="دخول المالك" subtitle="سَنَد — منطقة محمية" backTo="/" tone="primary">
      <div className="-mt-6 rounded-2xl bg-card p-6 shadow-soft">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-black">لوحة تحكم المالك</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          الدخول لهذه الصفحة محمي. من فضلك أدخل كلمة سر المالك للمتابعة.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="كلمة سر المالك"
            autoFocus
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-bold outline-none focus:border-primary"
          />
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground"
          >
            {submitting ? "جاري التحقق..." : "دخول"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function toCSV(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = headers.map((h) => escape(h.label)).join(",");
  const body = rows.map((r) => headers.map((h) => escape(r[h.key])).join(",")).join("\n");
  return "\uFEFF" + head + "\n" + body;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function statusLabel(s: string) {
  if (s === "done") return "مكتمل";
  if (s === "in") return "قيد الكشف";
  if (s === "cancelled") return "ملغي";
  return "بانتظار التأكيد";
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0, pending: 0, bookings: 0 });
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<"analytics" | "pending" | "verified" | "bookings" | "users" | "live" | "media" | "system">("analytics");
  const featureFn = useServerFn(godSetFeatured);
  const [editing, setEditing] = useState<ClinicRow | null>(null);

  const check = useServerFn(checkAdminUnlocked);
  const list = useServerFn(adminListClinics);
  const verify = useServerFn(adminVerifyClinic);
  const remove = useServerFn(adminDeleteClinic);
  const stat = useServerFn(adminStats);
  const toggleDisable = useServerFn(adminToggleDisableClinic);
  const setVerified = useServerFn(adminSetVerified);
  const editClinic = useServerFn(adminEditClinic);
  const listBookings = useServerFn(adminListBookings);
  const analyticsFn = useServerFn(adminAnalytics);

  useEffect(() => {
    let cancelled = false;
    check()
      .then((res) => {
        if (!cancelled) setAuthed(res.unlocked === true);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [check]);

  const refresh = async () => {
    try {
      const [{ rows }, s, a, b] = await Promise.all([
        list(),
        stat(),
        analyticsFn(),
        listBookings(),
      ]);
      const mapped: ClinicRow[] = rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        doctor: r.doctor as string,
        specialtyId: r.specialty_id as string,
        address: (r.address as string) ?? "",
        area: (r.area as string) ?? "",
        phone: (r.phone as string) ?? "",
        price: Number(r.price) || 0,
        rating: Number(r.rating) || 0,
        reviews: Number(r.reviews) || 0,
        availableNow: Boolean(r.available_now),
        distanceKm: Number(r.distance_km) || 0,
        nowServing: Number(r.now_serving) || 0,
        yourNumber: Number(r.your_number) || 0,
        waitingCount: Number(r.waiting_count) || 0,
        lat: Number(r.lat) || 0,
        lng: Number(r.lng) || 0,
        isVerified: Boolean(r.is_verified),
        isDisabled: Boolean(r.is_disabled),
        isFeatured: Boolean(r.is_featured),
        clinicStatus: ((r.clinic_status as string) || "normal") as ClinicRow["clinicStatus"],
        delayMinutes: Number(r.delay_minutes) || 0,
        bookingsClosed: Boolean(r.bookings_closed),
        submittedAt: r.submitted_at ? new Date(r.submitted_at as string).getTime() : Date.now(),
        updatedAt: r.updated_at ? new Date(r.updated_at as string).getTime() : Date.now(),
      }));
      setClinics(mapped);
      setStats(s);
      setAnalytics(a as Analytics);
      setBookings((b.rows as BookingRow[]) ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!authed) return;
    refresh();
  }, [authed]);

  if (!ready) return null;
  if (!authed) return <AdminGate onUnlock={() => setAuthed(true)} />;

  const pending = clinics.filter((c) => !c.isVerified);
  const verified = clinics;

  const approve = async (id: string) => {
    await verify({ data: { id } });
    await refresh();
  };
  const reject = async (id: string) => {
    if (!confirm("متأكد إنك عايز تحذف العيادة دي؟")) return;
    await remove({ data: { id } });
    await refresh();
  };
  const togglePause = async (c: ClinicRow) => {
    await toggleDisable({ data: { id: c.id, disabled: !c.isDisabled } });
    await refresh();
  };
  const toggleVerified = async (c: ClinicRow) => {
    if (c.isVerified && !confirm("هتلغي شارة التوثيق؟ العيادة هتفضل ظاهرة بدون الشارة.")) return;
    await setVerified({ data: { id: c.id, verified: !c.isVerified } });
    await refresh();
  };

  const exportClinicsCSV = () => {
    const rows = clinics.map((c) => ({
      doctor: c.doctor,
      specialty: getSpecialty(c.specialtyId)?.name ?? c.specialtyId,
      area: c.area,
      address: c.address,
      phone: c.phone,
      price: c.price,
      status: c.isVerified ? (c.isDisabled ? "معطلة" : "موثقة") : "بانتظار التوثيق",
    }));
    const csv = toCSV(rows, [
      { key: "doctor", label: "الطبيب" },
      { key: "specialty", label: "التخصص" },
      { key: "area", label: "المنطقة" },
      { key: "address", label: "العنوان" },
      { key: "phone", label: "الهاتف" },
      { key: "price", label: "السعر" },
      { key: "status", label: "الحالة" },
    ]);
    downloadCSV(`sanad-clinics-${Date.now()}.csv`, csv);
  };

  const exportBookingsCSV = () => {
    const clinicMap = new Map(clinics.map((c) => [c.id, c]));
    const rows = bookings.map((b) => ({
      code: b.code,
      patient: b.patient_name,
      phone: b.patient_phone,
      doctor: clinicMap.get(b.clinic_id)?.doctor ?? "",
      day: b.day_label,
      slot: b.slot,
      queue: b.queue_number,
      status: statusLabel(b.status),
      created: new Date(b.created_at).toLocaleString("ar-EG"),
    }));
    const csv = toCSV(rows, [
      { key: "code", label: "كود الحجز" },
      { key: "patient", label: "المريض" },
      { key: "phone", label: "الهاتف" },
      { key: "doctor", label: "الطبيب" },
      { key: "day", label: "اليوم" },
      { key: "slot", label: "الميعاد" },
      { key: "queue", label: "الدور" },
      { key: "status", label: "الحالة" },
      { key: "created", label: "وقت الحجز" },
    ]);
    downloadCSV(`sanad-bookings-${Date.now()}.csv`, csv);
  };

  return (
    <AppShell title="لوحة تحكم الأدمن" subtitle="سَنَد — الإدارة" backTo="/" tone="primary">
      {/* KPI */}
      <div className="-mt-6 grid grid-cols-2 gap-3">
        <KPI icon={Building2} label="عيادات موثّقة" value={String(clinics.filter((c) => c.isVerified && !c.isDisabled).length)} />
        <KPI icon={Users} label="إجمالي العيادات" value={String(stats.total)} />
        <KPI icon={Calendar} label="إجمالي الحجوزات" value={String(stats.bookings)} />
        <KPI icon={ShieldCheck} label="بانتظار التوثيق" value={String(pending.length)} tone="warn" />
      </div>

      {/* Tabs */}
      <div className="mt-6 grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
        {([
          ["analytics", "التحليلات"],
          ["pending", `التوثيق (${pending.length})`],
          ["verified", `العيادات (${verified.length})`],
          ["bookings", "تقارير الحجز"],
          ["users", "الحسابات"],
          ["live", "حجوزات مباشرة"],
          ["media", "الوسائط"],
          ["system", "الطوارئ"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl py-2 text-[11px] font-bold ${
              tab === k ? "bg-card shadow-soft" : "text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "analytics" && <AnalyticsTab analytics={analytics} pendingCount={pending.length} />}
      {tab === "users" && <UsersTab />}
      {tab === "live" && <LiveBookingsTab />}
      {tab === "media" && <MediaTab />}
      {tab === "system" && <SystemTab />}

      {tab === "pending" && (
        <div className="mt-4 space-y-3">
          {pending.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              ما فيش أطباء بانتظار شارة التوثيق ✅
            </div>
          )}
          {pending.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg font-black text-primary">
                  {getSpecialty(p.specialtyId)?.emoji ?? "🩺"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.doctor}</p>
                  <p className="text-xs text-muted-foreground">
                    {getSpecialty(p.specialtyId)?.name} — {p.area}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.address} • 📞 {p.phone}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => approve(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground"
                >
                  <BadgeCheck className="h-4 w-4" /> منح شارة التوثيق
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-bold text-destructive"
                >
                  <X className="h-4 w-4" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "verified" && (
        <div className="mt-4 space-y-3">
          <button
            onClick={exportClinicsCSV}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> تصدير كل العيادات (CSV)
          </button>
          {verified.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              ما فيش عيادات موثّقة لحد دلوقتي.
            </div>
          )}
          {verified.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl border p-4 ${
                c.isDisabled ? "border-warning/40 bg-warning/5" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-lg">
                  {getSpecialty(c.specialtyId)?.emoji ?? "🩺"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold">{c.doctor}</p>
                    {c.isVerified ? (
                      <BadgeCheck className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">غير موثّق</span>
                    )}
                    {c.isDisabled && (
                      <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold text-warning">
                        معطلة مؤقتاً
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getSpecialty(c.specialtyId)?.name} — {c.area}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {c.address} • 📞 {c.phone}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleVerified(c)}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold ${c.isVerified ? "bg-warning/15 text-warning" : "bg-success text-success-foreground"}`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" /> {c.isVerified ? "إلغاء التوثيق" : "توثيق"}
                </button>
                <button
                  onClick={async () => {
                    await featureFn({ data: { id: c.id, featured: !c.isFeatured } });
                    await refresh();
                  }}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold ${c.isFeatured ? "bg-primary text-primary-foreground" : "border border-border"}`}
                >
                  ⭐ {c.isFeatured ? "طبيب مميز" : "تمييز"}
                </button>
                <button
                  onClick={() => setEditing(c)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2 text-xs font-bold"
                >
                  <Pencil className="h-3.5 w-3.5" /> تعديل
                </button>
                <button
                  onClick={() => togglePause(c)}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold ${
                    c.isDisabled
                      ? "bg-success text-success-foreground"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {c.isDisabled ? (
                    <>
                      <Play className="h-3.5 w-3.5" /> إعادة تفعيل
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" /> إيقاف مؤقت
                    </>
                  )}
                </button>
                <button
                  onClick={() => reject(c.id)}
                  className="col-span-2 flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold text-destructive"
                >
                  <X className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bookings" && (
        <BookingsTab
          bookings={bookings}
          clinics={clinics}
          onExport={exportBookingsCSV}
        />
      )}

      {editing && (
        <EditClinicModal
          clinic={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await editClinic({ data: { id: editing.id, ...patch } });
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </AppShell>
  );
}

function AnalyticsTab({
  analytics,
  pendingCount,
}: {
  analytics: Analytics | null;
  pendingCount: number;
}) {
  if (!analytics) {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        جاري تحميل التحليلات...
      </div>
    );
  }
  const maxClinic = Math.max(1, ...analytics.topClinics.map((c) => c.count));
  const maxSpec = Math.max(1, ...analytics.topSpecialties.map((s) => s.count));

  return (
    <div className="mt-4 space-y-4">
      {/* Quick summary */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <p className="text-sm font-black">ملخص سريع</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <SummaryBox label="حجوزات" value={analytics.totalBookings} />
          <SummaryBox label="عيادات مسجلة" value={analytics.totalClinics} />
          <SummaryBox label="بانتظار التفعيل" value={pendingCount} tone="warn" />
        </div>
      </div>

      {/* Top clinics */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          <p className="text-sm font-black">أكثر العيادات استقبالاً للحجوزات</p>
        </div>
        {analytics.topClinics.length === 0 ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">لا توجد حجوزات بعد.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {analytics.topClinics.map((c, i) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-bold">
                    {i + 1}. {c.doctor}
                  </span>
                  <span className="font-black text-primary">{c.count} حجز</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(c.count / maxClinic) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top specialties */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <p className="text-sm font-black">أكثر التخصصات طلباً</p>
        </div>
        {analytics.topSpecialties.length === 0 ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">لا توجد بيانات كافية.</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {analytics.topSpecialties.map((s) => {
              const spec = getSpecialty(s.specialtyId);
              return (
                <div key={s.specialtyId}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">
                      {spec?.emoji ?? "🩺"} {spec?.name ?? s.specialtyId}
                    </span>
                    <span className="font-black text-success">{s.count} حجز</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${(s.count / maxSpec) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Specialties breakdown */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-black">تفاصيل التخصصات</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {specialties.map((s) => {
            const count = analytics.topSpecialties.find((x) => x.specialtyId === s.id)?.count ?? 0;
            return (
              <div key={s.id} className="rounded-xl bg-secondary p-3">
                <div className="text-lg">{s.emoji}</div>
                <p className="mt-1 text-xs font-bold">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{count} حجز</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl bg-card/70 p-2.5 backdrop-blur">
      <p className={`text-xl font-black ${tone === "warn" ? "text-warning" : "text-primary"}`}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function BookingsTab({
  bookings,
  clinics,
  onExport,
}: {
  bookings: BookingRow[];
  clinics: ClinicRow[];
  onExport: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "waiting" | "in" | "done" | "cancelled">("all");
  const clinicMap = useMemo(() => new Map(clinics.map((c) => [c.id, c])), [clinics]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (!needle) return true;
      return (
        b.patient_name.toLowerCase().includes(needle) ||
        b.patient_phone.toLowerCase().includes(needle) ||
        b.code.toLowerCase().includes(needle)
      );
    });
  }, [bookings, q, status]);

  return (
    <div className="mt-4 space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو كود الحجز..."
          className="w-full rounded-xl border border-border bg-card py-3 pr-10 pl-4 text-sm font-bold outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          ["all", "الكل"],
          ["waiting", "بانتظار التأكيد"],
          ["in", "قيد الكشف"],
          ["done", "مكتمل"],
          ["cancelled", "ملغي"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
              status === k
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <button
        onClick={onExport}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground"
      >
        <Download className="h-4 w-4" /> تصدير الحجوزات (CSV / Excel)
      </button>

      <p className="text-xs text-muted-foreground">
        عدد النتائج: <span className="font-black text-foreground">{filtered.length}</span>
      </p>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          مافيش حجوزات مطابقة للبحث.
        </div>
      )}

      {filtered.map((b) => {
        const clinic = clinicMap.get(b.clinic_id);
        return (
          <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black">{b.patient_name}</p>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {b.code}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">📞 {b.patient_phone}</p>
                <p className="text-[11px] text-muted-foreground">
                  👨‍⚕️ {clinic?.doctor ?? "غير معروف"} • {b.day_label} • {b.slot}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                  b.status === "done"
                    ? "bg-success/15 text-success"
                    : b.status === "in"
                      ? "bg-primary/15 text-primary"
                      : b.status === "cancelled"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-warning/15 text-warning"
                }`}
              >
                {statusLabel(b.status)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EditClinicModal({
  clinic,
  onClose,
  onSave,
}: {
  clinic: ClinicRow;
  onClose: () => void;
  onSave: (patch: {
    doctor: string;
    specialtyId: string;
    address: string;
    area: string;
    phone: string;
    price: number;
  }) => Promise<void>;
}) {
  const [doctor, setDoctor] = useState(clinic.doctor);
  const [specialtyId, setSpecialtyId] = useState(clinic.specialtyId);
  const [address, setAddress] = useState(clinic.address);
  const [area, setArea] = useState(clinic.area);
  const [phone, setPhone] = useState(clinic.phone);
  const [price, setPrice] = useState(String(clinic.price));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave({
        doctor: doctor.trim(),
        specialtyId,
        address: address.trim(),
        area: area.trim(),
        phone: phone.trim(),
        price: Number(price) || 0,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-soft"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-black">تعديل بيانات العيادة</p>
          <button type="button" onClick={onClose} className="rounded-full bg-secondary p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2.5">
          <Field label="اسم الطبيب">
            <input
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
            />
          </Field>
          <Field label="التخصص">
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
            >
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="المنطقة">
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
              />
            </Field>
            <Field label="الهاتف">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
              />
            </Field>
          </div>
          <Field label="العنوان">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
            />
          </Field>
          <Field label="سعر الكشف (جنيه)">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm font-bold outline-none focus:border-primary"
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-black text-primary-foreground disabled:opacity-60"
        >
          {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div
        className={`grid h-9 w-9 place-items-center rounded-xl ${
          tone === "warn" ? "bg-warning/20 text-warning" : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}