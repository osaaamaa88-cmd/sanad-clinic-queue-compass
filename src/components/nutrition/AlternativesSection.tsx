import { Loader2, Plus, Sparkles } from "lucide-react";
import type { Alternative } from "@/lib/nutrition.functions";
import type { Meal } from "@/hooks/use-nutrition";

const SUGGESTIONS = ["بديل صحي للحواوشي", "بديل للكشري", "عشاء خفيف مشبع", "سناك عالي البروتين"];

export function AlternativesSection({
  altQ,
  onAltQChange,
  altBusy,
  alts,
  remaining,
  meal,
  onAsk,
  onAddAlt,
}: {
  altQ: string;
  onAltQChange: (q: string) => void;
  altBusy: boolean;
  alts: Alternative[];
  remaining: number;
  meal: Meal;
  onAsk: (q: string) => void;
  onAddAlt: (a: Alternative) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-base font-extrabold">
        <Sparkles className="h-5 w-5 text-primary" /> بدائل مصرية ذكية
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        اكتب الأكلة اللي نفسك فيها أو هدفك، ونقترحلك بدائل تناسب الـ
        {remaining} سعر الفاضلين وسجل أكلك.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={altBusy}
            onClick={() => void onAsk(q)}
            className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void onAsk(altQ);
        }}
      >
        <input
          value={altQ}
          onChange={(e) => onAltQChange(e.target.value)}
          placeholder="مثلاً: نفسي في شاورما"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          disabled={altBusy}
          className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"
          aria-label="اقترح"
        >
          {altBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
        </button>
      </form>
      {altBusy && <p className="mt-3 text-center text-xs text-muted-foreground">بنجهزلك بدائل…</p>}
      {alts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {alts.map((a, i) => (
            <li key={i} className="rounded-2xl bg-primary-soft/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.amount}</p>
                </div>
                <p className="shrink-0 font-extrabold text-primary">{a.calories} سعر</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                بروتين {a.protein}ج • كارب {a.carbs}ج • دهون {a.fat}ج
              </p>
              {a.saving && <p className="mt-1 text-xs font-bold text-success">{a.saving}</p>}
              {a.tip && <p className="mt-1 text-xs text-muted-foreground">💡 {a.tip}</p>}
              <button
                type="button"
                onClick={() => onAddAlt(a)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> أضف لـ{meal}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
