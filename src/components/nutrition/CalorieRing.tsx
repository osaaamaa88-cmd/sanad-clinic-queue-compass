const R = 54;
const C = 2 * Math.PI * R;

export function CalorieRing({
  eaten,
  target,
  macros,
}: {
  eaten: number;
  target: number;
  macros: { p: number; c: number; f: number };
}) {
  const pct = Math.min(1, eaten / Math.max(1, target));
  return (
    <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" className="stroke-muted" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          className={eaten > target ? "stroke-destructive" : "stroke-primary"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s" }}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="rotate-90 fill-foreground text-[20px] font-extrabold"
          transform="rotate(90 60 60)"
        >
          {eaten}
        </text>
        <text
          x="60"
          y="76"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          transform="rotate(90 60 60)"
        >
          من {target}
        </text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="font-extrabold">
          {eaten > target ? `زيادة ${eaten - target} سعر` : `فاضلك ${target - eaten} سعر`}
        </p>
        <p className="text-xs text-muted-foreground">
          بروتين {macros.p}ج • كارب {macros.c}ج • دهون {macros.f}ج
        </p>
      </div>
    </section>
  );
}
