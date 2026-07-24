import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, TrendingUp, Users, Building2, Calendar, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { specialties } from "@/lib/mock-data";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "طبيبك — لوحة الأدمن" }] }),
  component: Admin,
});

type Pending = { id: string; doctor: string; specialty: string; area: string; submitted: string };

const pendingInit: Pending[] = [
  { id: "p1", doctor: "د. إسلام حمدي", specialty: "أسنان", area: "التجمع الخامس", submitted: "من ٢ ساعة" },
  { id: "p2", doctor: "د. رانيا مصطفى", specialty: "أطفال", area: "شبرا الخيمة", submitted: "من ٥ ساعات" },
  { id: "p3", doctor: "د. طارق نبيل", specialty: "عظام", area: "المعادي", submitted: "امبارح" },
  { id: "p4", doctor: "د. دينا سعيد", specialty: "جلدية", area: "الزقازيق", submitted: "امبارح" },
];

function Admin() {
  const [pending, setPending] = useState(pendingInit);
  const [tab, setTab] = useState<"pending" | "stats" | "specs">("pending");

  const decide = (id: string) => setPending((p) => p.filter((x) => x.id !== id));

  return (
    <AppShell title="لوحة تحكم الأدمن" subtitle="طبيبك — الإدارة" backTo="/" tone="primary">
      {/* Stats */}
      <div className="-mt-6 grid grid-cols-2 gap-3">
        <KPI icon={Building2} label="عيادات مفعّلة" value="١٢٤" />
        <KPI icon={Users} label="مرضى مسجلين" value="٣,٨٩٢" />
        <KPI icon={Calendar} label="حجوزات النهاردة" value="٤١٧" />
        <KPI icon={ShieldCheck} label="بانتظار التوثيق" value={String(pending.length)} tone="warn" />
      </div>

      {/* Tabs */}
      <div className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
        {([
          ["pending", `التوثيق (${pending.length})`],
          ["stats", "الإحصائيات"],
          ["specs", "التخصصات"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-xl py-2 text-xs font-bold ${
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
                  {p.doctor.charAt(3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.doctor}</p>
                  <p className="text-xs text-muted-foreground">{p.specialty} — {p.area}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">قدّم طلبه {p.submitted}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => decide(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground"
                >
                  <Check className="h-4 w-4" /> توثيق
                </button>
                <button
                  onClick={() => decide(p.id)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-border bg-card py-2.5 text-sm font-bold text-destructive"
                >
                  <X className="h-4 w-4" /> رفض
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
              <p className="text-sm font-bold">حجوزات آخر ٧ أيام</p>
            </div>
            <div className="mt-4 flex h-32 items-end gap-2">
              {[40, 65, 55, 80, 70, 95, 88].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-lg gradient-primary" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {["س", "ح", "ن", "ث", "ر", "خ", "ج"].map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-bold">أكتر التخصصات طلباً</p>
            <div className="mt-3 space-y-2.5">
              {[
                { name: "أسنان", pct: 32 },
                { name: "أطفال", pct: 24 },
                { name: "باطنة", pct: 18 },
                { name: "جلدية", pct: 14 },
                { name: "عظام", pct: 12 },
              ].map((r) => (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">{r.name}</span>
                    <span className="text-muted-foreground">{r.pct}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full gradient-primary" style={{ width: `${r.pct * 3}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "specs" && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {specialties.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="text-2xl">{s.emoji}</div>
              <p className="mt-2 font-bold">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.floor(5 + Math.random() * 40)} عيادة
              </p>
            </div>
          ))}
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