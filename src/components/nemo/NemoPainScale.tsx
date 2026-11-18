import { HeartPulse } from "lucide-react";

type NemoPainScaleProps = {
  /** The scale shows when the patient mentions pain or a level was recorded. */
  showScale: boolean;
  painLevel: number | null;
  dismissed: boolean;
  urgent: boolean;
  onSelect: (level: number) => void;
  onDismiss: () => void;
  onReopen: () => void;
};

export function NemoPainScale({
  showScale,
  painLevel,
  dismissed,
  urgent,
  onSelect,
  onDismiss,
  onReopen,
}: NemoPainScaleProps) {
  return (
    <>
      {showScale && !dismissed && (
        <section className="order-4 rounded-3xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-foreground">مقياس شدة الألم</h3>
              <p className="mt-1 text-xs text-muted-foreground">من 1 (خفيف) إلى 10 (شديد)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDismiss}
                aria-label="إغلاق مقياس الألم"
                className="min-h-11 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground transition hover:bg-secondary/80"
              >
                ✕ إغلاق
              </button>
              <HeartPulse className={`h-6 w-6 ${urgent ? "text-destructive" : "text-primary"}`} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2" dir="ltr">
            {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => {
              const tone =
                level <= 3
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : level <= 7
                    ? "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
                    : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100";
              const critical = level >= 8;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onSelect(level)}
                  aria-pressed={painLevel === level}
                  aria-label={`شدة الألم ${level} من 10`}
                  className={`grid h-11 place-items-center rounded-xl border text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${tone} ${
                    critical ? "motion-safe:animate-pulse" : ""
                  } ${painLevel === level ? "ring-2 ring-primary ring-offset-1" : ""}`}
                >
                  {level}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold">
            <span className="text-emerald-700">1–3 خفيف</span>
            <span className="text-orange-700">4–7 متوسط</span>
            <span className="text-rose-700">8–10 شديد</span>
          </div>
        </section>
      )}

      {painLevel !== null && dismissed && (
        <div className="order-4 flex justify-center">
          <button
            type="button"
            onClick={onReopen}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm transition hover:bg-secondary"
          >
            شدة الألم المسجلة: {painLevel}/10 • تعديل
          </button>
        </div>
      )}
    </>
  );
}
