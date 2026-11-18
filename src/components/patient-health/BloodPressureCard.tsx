import { Link } from "@tanstack/react-router";
import { Heart, Save, Siren } from "lucide-react";
import { toneClasses, type BPCategory } from "@/lib/vitals-evaluation";

type BloodPressureCardProps = {
  sys: string;
  dia: string;
  sysN: number;
  diaN: number;
  bp: BPCategory | null;
  bpErr: string | null;
  onSysChange: (value: string) => void;
  onDiaChange: (value: string) => void;
  onSaveBP: () => void;
};

export function BloodPressureCard({
  sys,
  dia,
  sysN,
  diaN,
  bp,
  bpErr,
  onSysChange,
  onDiaChange,
  onSaveBP,
}: BloodPressureCardProps) {
  return (
    <section className="-mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
          <Heart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">قياس ضغط الدم</h2>
          <p className="text-xs text-muted-foreground">أدخل قراءة الانقباضي والانبساطي</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">الانقباضي (Systolic)</span>
          <input
            type="number"
            inputMode="numeric"
            value={sys}
            onChange={(e) => onSysChange(e.target.value)}
            placeholder="120"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">الانبساطي (Diastolic)</span>
          <input
            type="number"
            inputMode="numeric"
            value={dia}
            onChange={(e) => onDiaChange(e.target.value)}
            placeholder="80"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
      </div>

      {bpErr && (
        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {bpErr}
        </p>
      )}
      {bp && (
        <div className={`mt-4 rounded-2xl border p-4 ${toneClasses[bp.tone]}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold">{bp.label}</p>
            <span className="text-xs font-bold opacity-90">
              {sysN}/{diaN}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">{bp.advice}</p>
          {bp.tone === "crisis" && (
            <Link
              to="/patient/emergency"
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-destructive-foreground/10 px-3 py-2 text-xs font-extrabold"
            >
              <Siren className="h-4 w-4" /> اذهب لأقرب طوارئ الآن
            </Link>
          )}
          <button
            onClick={onSaveBP}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
          >
            <Save className="h-4 w-4" /> حفظ القراءة في ملفي الطبي
          </button>
        </div>
      )}

      <details className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs">
        <summary className="cursor-pointer font-bold">المعايير (AHA/ADA)</summary>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>طبيعي: أقل من 120/80</li>
          <li>مرتفع بسيط: 120–129 والانبساطي أقل من 80</li>
          <li>مرحلة أولى: 130–139 أو 80–89</li>
          <li>مرحلة ثانية: 140+ أو 90+</li>
          <li>أزمة ضغط: أعلى من 180/120</li>
        </ul>
      </details>
    </section>
  );
}
