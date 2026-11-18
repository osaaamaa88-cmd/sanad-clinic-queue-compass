import type { Entry } from "@/hooks/use-nutrition";

export function WeekChart({ log, target }: { log: Entry[]; target: number }) {
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const total = log
      .filter((e) => new Date(e.at).toDateString() === d.toDateString())
      .reduce((s, e) => s + e.calories, 0);
    return { label: d.toLocaleDateString("ar-EG", { weekday: "short" }), total };
  });
  const maxWeek = Math.max(target, ...week.map((w) => w.total));

  return (
    <section className="rounded-3xl border border-border bg-card p-4">
      <h3 className="text-sm font-extrabold">آخر ٧ أيام</h3>
      <div className="mt-3 flex h-28 items-end gap-2">
        {week.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`w-full rounded-t-lg ${w.total > target ? "bg-destructive/70" : "bg-primary/70"}`}
              style={{ height: `${(w.total / maxWeek) * 90}px` }}
            />
            <span className="text-xs text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
