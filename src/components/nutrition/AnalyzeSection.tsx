import { useRef } from "react";
import { Camera, Loader2, Plus, Search } from "lucide-react";
import type { FoodAnalysis } from "@/lib/nutrition.functions";
import type { Meal } from "@/hooks/use-nutrition";

const MEALS: Meal[] = ["فطور", "غداء", "عشاء", "سناك"];

export function AnalyzeSection({
  meal,
  onMealChange,
  text,
  onTextChange,
  busy,
  preview,
  result,
  onAnalyzeImage,
  onAnalyzeText,
  onAddResult,
}: {
  meal: Meal;
  onMealChange: (m: Meal) => void;
  text: string;
  onTextChange: (t: string) => void;
  busy: boolean;
  preview: string | null;
  result: FoodAnalysis | null;
  onAnalyzeImage: (f?: File) => void;
  onAnalyzeText: (t: string) => void;
  onAddResult: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-3xl border border-primary/30 bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <Camera className="h-5 w-5 text-primary" /> سجّل وجبة
      </h2>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {MEALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMealChange(m)}
            className={`rounded-xl border px-1 py-2 text-xs font-bold ${meal === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void onAnalyzeImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="gradient-primary mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-extrabold text-primary-foreground active:scale-95 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} صوّر
        الطبق
      </button>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onAnalyzeText(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="أو اكتب: طبق كشري وسط"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={busy}
          className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"
          aria-label="تحليل"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {preview && (
        <img src={preview} alt="الطبق" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />
      )}
      {busy && <p className="mt-3 text-center text-xs text-muted-foreground">بنحلل الأكل…</p>}
      {result && (
        <div className="mt-3 rounded-2xl bg-primary-soft/40 p-3">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">{result.name}</p>
            <p className="text-lg font-extrabold text-primary">{result.calories} سعر</p>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
            {[
              ["بروتين", result.protein],
              ["كارب", result.carbs],
              ["دهون", result.fat],
              ["ألياف", result.fiber],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-card p-1.5">
                <b className="block text-sm">{v}ج</b>
                {l}
              </div>
            ))}
          </div>
          {result.items.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {result.items.map((i, k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>
                    {i.name} <span className="text-muted-foreground">({i.amount})</span>
                  </span>
                  <span>{i.calories}</span>
                </li>
              ))}
            </ul>
          )}
          {result.advice && (
            <p className="mt-2 text-xs text-muted-foreground">💡 {result.advice}</p>
          )}
          {result.calories > 0 && (
            <button
              type="button"
              onClick={onAddResult}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> أضف لـ{meal}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
