import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus, Clock, Check, X, Phone } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/reception")({
  head: () => ({ meta: [{ title: "طبيبك — لوحة السكرتير" }] }),
  component: Reception,
});

type Row = { id: number; name: string; phone: string; time: string; status: "waiting" | "in" | "done"; walkIn?: boolean };

const initial: Row[] = [
  { id: 1, name: "محمد علي", phone: "01001234567", time: "٤:٠٠ م", status: "done" },
  { id: 2, name: "فاطمة السيد", phone: "01007654321", time: "٤:٣٠ م", status: "done" },
  { id: 3, name: "أحمد فؤاد", phone: "01111112222", time: "٥:٠٠ م", status: "done" },
  { id: 4, name: "منى إبراهيم", phone: "01223334444", time: "٥:٣٠ م", status: "done" },
  { id: 5, name: "خالد سمير", phone: "01555556666", time: "٦:٠٠ م", status: "done" },
  { id: 6, name: "ياسمين حسن", phone: "01099887766", time: "٦:٣٠ م", status: "done" },
  { id: 7, name: "علي مصطفى", phone: "01011112222", time: "٧:٠٠ م", status: "in" },
  { id: 8, name: "نور الدين", phone: "01033445566", time: "٧:١٥ م", status: "waiting" },
  { id: 9, name: "سلمى أحمد", phone: "01077778888", time: "٧:٣٠ م", status: "waiting" },
  { id: 10, name: "عمر شريف", phone: "01099990000", time: "٧:٤٥ م", status: "waiting" },
  { id: 11, name: "هدى فتحي", phone: "01088776655", time: "٨:٠٠ م", status: "waiting" },
];

export default function _unused() {}

function Reception() {
  const [rows, setRows] = useState<Row[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const currentIdx = rows.findIndex((r) => r.status === "in");
  const current = rows[currentIdx];
  const done = rows.filter((r) => r.status === "done").length;
  const waiting = rows.filter((r) => r.status === "waiting").length;

  const next = () => {
    setRows((rs) => {
      const copy = [...rs];
      const inIdx = copy.findIndex((r) => r.status === "in");
      if (inIdx >= 0) copy[inIdx] = { ...copy[inIdx], status: "done" };
      const nextIdx = copy.findIndex((r) => r.status === "waiting");
      if (nextIdx >= 0) copy[nextIdx] = { ...copy[nextIdx], status: "in" };
      return copy;
    });
  };

  const addWalkIn = () => {
    if (!name.trim()) return;
    setRows((rs) => [
      ...rs,
      {
        id: rs.length + 1,
        name: name.trim(),
        phone: phone.trim() || "—",
        time: "الآن",
        status: "waiting",
        walkIn: true,
      },
    ]);
    setName("");
    setPhone("");
    setShowAdd(false);
  };

  return (
    <AppShell title="لوحة السكرتير" subtitle="عيادة د. أحمد السيد — الأسنان" backTo="/">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox value={String(current?.id ?? "—")} label="النمرة دلوقتي" tone="primary" />
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
              {current.id}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{current.name}</p>
              <p className="text-xs text-muted-foreground">{current.phone}</p>
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
              {r.id}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">{r.name}</p>
                {r.walkIn && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold">حضوري</span>}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> {r.time} • <Phone className="h-3 w-3" /> {r.phone}
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