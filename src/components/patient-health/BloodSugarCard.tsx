import { Droplet, Save } from "lucide-react";
import { toneClasses, type SugarCategory, type SugarState } from "@/lib/vitals-evaluation";

type BloodSugarCardProps = {
  sugar: string;
  sugarN: number;
  sugarState: SugarState;
  sug: SugarCategory | null;
  sugErr: string | null;
  onSugarChange: (value: string) => void;
  onSugarStateChange: (state: SugarState) => void;
  onSaveSugar: () => void;
};

const SUGAR_STATES: { id: SugarState; label: string }[] = [
  { id: "fasting", label: "صائم" },
  { id: "postmeal", label: "بعد الأكل بساعتين" },
  { id: "random", label: "عشوائي" },
];

export function BloodSugarCard({
  sugar,
  sugarN,
  sugarState,
  sug,
  sugErr,
  onSugarChange,
  onSugarStateChange,
  onSaveSugar,
}: BloodSugarCardProps) {
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
          <Droplet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">قياس السكر في الدم</h2>
          <p className="text-xs text-muted-foreground">القيمة بالـ mg/dL</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {SUGAR_STATES.map((o) => (
          <button
            key={o.id}
            onClick={() => onSugarStateChange(o.id)}
            className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
              sugarState === o.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold">القيمة (mg/dL)</span>
        <input
          type="number"
          inputMode="numeric"
          value={sugar}
          onChange={(e) => onSugarChange(e.target.value)}
          placeholder="مثال: 95"
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>

      {sugErr && (
        <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {sugErr}
        </p>
      )}
      {sug && (
        <div className={`mt-4 rounded-2xl border p-4 ${toneClasses[sug.tone]}`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold">{sug.label}</p>
            <span className="text-xs font-bold opacity-90">{sugarN} mg/dL</span>
          </div>
          <p className="mt-1 text-xs opacity-90">{sug.advice}</p>
          <button
            onClick={onSaveSugar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
          >
            <Save className="h-4 w-4" /> حفظ القراءة في ملفي الطبي
          </button>
        </div>
      )}

      <details className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs">
        <summary className="cursor-pointer font-bold">المعايير (ADA)</summary>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>صائم: طبيعي أقل من 100 — ما قبل السكري 100–125 — سكري 126+</li>
          <li>بعد الأكل بساعتين: طبيعي أقل من 140 — ما قبل السكري 140–199 — سكري 200+</li>
          <li>عشوائي: مرتفع من 140، ومرتفع جداً من 200</li>
        </ul>
      </details>
    </section>
  );
}
