import { Droplets } from "lucide-react";

export function HydrationTracker({
  hydration,
  onHydrationChange,
}: {
  hydration: number;
  onHydrationChange: (value: number) => void;
}) {
  return (
    <div className="card-medical-mint p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">متتبع شرب الماء</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hydration}/8 أكواب • {Math.round((hydration / 8) * 100)}%
          </p>
        </div>
        <Droplets className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onHydrationChange(i + 1)}
            className={`grid aspect-square min-h-11 min-w-11 place-items-center rounded-full border transition active:scale-95 ${
              i < hydration
                ? "border-primary/40 bg-primary/20 text-primary"
                : "border-border bg-secondary/50 text-muted-foreground"
            }`}
            aria-label={`كوب ${i + 1}`}
          >
            <Droplets className="h-4 w-4" />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onHydrationChange(0)}
        className="mt-2 min-h-11 text-xs font-bold text-muted-foreground transition hover:text-primary"
      >
        إعادة تعيين
      </button>
    </div>
  );
}
