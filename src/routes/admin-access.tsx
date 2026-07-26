import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, TrendingUp, Users, Building2, Calendar, ShieldCheck, BadgeCheck, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { specialties, getSpecialty, type Clinic } from "@/lib/mock-data";
import {
  adminListClinics,
  adminVerifyClinic,
  adminDeleteClinic,
  adminStats,
} from "@/lib/admin.functions";
import { checkAdminUnlocked, unlockAdmin } from "@/lib/admin-gate.functions";

export const Route = createFileRoute("/admin-access")({
  head: () => ({ meta: [{ title: "سندي — لوحة الأدمن" }] }),
  component: Admin,
});

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
      if (res.ok) {
        onUnlock();
      } else {
        setError("كلمة السر غير صحيحة، غير مصرح لك بالدخول");
      }
    } catch {
      setError("حصل خطأ أثناء التحقق. حاول تاني.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="دخول المالك" subtitle="سندي — منطقة محمية" backTo="/" tone="primary">
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

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "دلوقتي";
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${h} ساعة`;
  const d = Math.floor(h / 24);
  return d === 1 ? "امبارح" : `من ${d} أيام`;
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Clinic[]>([]);
  const [verified, setVerified] = useState<Clinic[]>([]);
  const [stats, setStats] = useState<{ total: number; verified: number; pending: number; bookings: number }>({
    total: 0,
    verified: 0,
    pending: 0,
    bookings: 0,
  });
  const [tab, setTab] = useState<"pending" | "verified" | "stats" | "specs">("pending");
  const check = useServerFn(checkAdminUnlocked);
  const list = useServerFn(adminListClinics);
  const verify = useServerFn(adminVerifyClinic);
  const remove = useServerFn(adminDeleteClinic);
  const stat = useServerFn(adminStats);

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
      const { rows } = await list();
      const mapped: Clinic[] = rows.map((r: Record<string, unknown>) => ({
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
        submittedAt: r.submitted_at ? new Date(r.submitted_at as string).getTime() : Date.now(),
      }));
      setPending(mapped.filter((c) => !c.isVerified));
      setVerified(mapped.filter((c) => c.isVerified));
      const s = await stat();
      setStats(s);
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

  const approve = async (id: string) => {
    await verify({ data: { id } });
    await refresh();
  };
  const reject = async (id: string) => {
    await remove({ data: { id } });
    await refresh();
  };

  const total = stats.total;

  return (
    <AppShell title="لوحة تحكم الأدمن" subtitle="سندي — الإدارة" backTo="/" tone="primary">
      {/* Stats */}
      <div className="-mt-6 grid grid-cols-2 gap-3">
        <KPI icon={Building2} label="عيادات موثّقة" value={String(verified.length)} />
        <KPI icon={Users} label="إجمالي العيادات" value={String(total)} />
        <KPI icon={Calendar} label="إجمالي الحجوزات" value={String(stats.bookings)} />
        <KPI icon={ShieldCheck} label="بانتظار التوثيق" value={String(pending.length)} tone="warn" />
      </div>

      {/* Tabs */}
      <div className="mt-6 grid grid-cols-4 gap-1 rounded-2xl bg-secondary p-1">
        {([
          ["pending", `التوثيق (${pending.length})`],
          ["verified", `الموثّقة (${verified.length})`],
          ["stats", "الإحصائيات"],
          ["specs", "التخصصات"],
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

      {tab === "pending" && (
        <div className="mt-4 space-y-3">
          {pending.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              ما فيش عيادات بانتظار التوثيق دلوقتي ✅
            </div>
          )}
          {pending.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft font-black text-primary">
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
                  <p className="mt-0.5 text-[11px] text-muted-foreground">قدّم طلبه {timeAgo(p.submittedAt)}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => approve(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground"
                >
                  <BadgeCheck className="h-4 w-4" /> تفعيل وتوثيق العيادة
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-bold text-destructive"
                >
                  <X className="h-4 w-4" /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "verified" && (
        <div className="mt-4 space-y-3">
          {verified.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              ما فيش عيادات موثّقة لحد دلوقتي.
            </div>
          )}
          {verified.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success/15 text-lg">
                  {getSpecialty(c.specialtyId)?.emoji ?? "🩺"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{c.doctor}</p>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-success" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getSpecialty(c.specialtyId)?.name} — {c.area}
                  </p>
                </div>
                <button
                  onClick={() => reject(c.id)}
                  className="rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-destructive"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "stats" && (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <p className="text-sm font-bold">نظرة عامة</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">إجمالي التسجيلات</p>
                <p className="mt-1 text-2xl font-black">{total}</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="text-xs text-muted-foreground">نسبة الموثّقة</p>
                <p className="mt-1 text-2xl font-black">
                  {total === 0 ? "٠%" : `${Math.round((verified.length / total) * 100)}%`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "specs" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {specialties.map((s) => {
            const count = verified.filter((c) => c.specialtyId === s.id).length;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="text-2xl">{s.emoji}</div>
                <p className="mt-2 font-bold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{count} عيادة موثّقة</p>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function KPI({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${
        tone === "warn" ? "bg-warning/20 text-warning" : "bg-primary-soft text-primary"
      }`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}