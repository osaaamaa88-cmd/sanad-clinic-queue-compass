import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, TrendingUp, Users, Building2, Calendar, ShieldCheck, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  specialties,
  getAllClinics,
  getPendingClinics,
  getVerifiedClinics,
  verifyClinic,
  deleteClinic,
  getSpecialty,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/admin-access")({
  head: () => ({ meta: [{ title: "سندي — لوحة الأدمن" }] }),
  component: Admin,
});

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
  const [pending, setPending] = useState<Clinic[]>([]);
  const [verified, setVerified] = useState<Clinic[]>([]);
  const [tab, setTab] = useState<"pending" | "verified" | "stats" | "specs">("pending");

  const refresh = () => {
    setPending(getPendingClinics());
    setVerified(getVerifiedClinics());
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("tabibak:clinics-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tabibak:clinics-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const approve = (id: string) => {
    verifyClinic(id);
    refresh();
  };
  const reject = (id: string) => {
    deleteClinic(id);
    refresh();
  };

  const total = getAllClinics().length;

  return (
    <AppShell title="لوحة تحكم الأدمن" subtitle="سندي — الإدارة" backTo="/" tone="primary">
      {/* Stats */}
      <div className="-mt-6 grid grid-cols-2 gap-3">
        <KPI icon={Building2} label="عيادات موثّقة" value={String(verified.length)} />
        <KPI icon={Users} label="إجمالي العيادات" value={String(total)} />
        <KPI icon={Calendar} label="حجوزات النهاردة" value="—" />
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