import { STRENGTH_LABELS, checkPassword } from "@/lib/password-policy";

export function PasswordStrength({ value, context }: { value: string; context?: string[] }) {
  if (!value) return null;
  const { score, error } = checkPassword(value, context);
  const tone = score >= 3 ? "bg-success" : score === 2 ? "bg-warning" : "bg-destructive";
  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.max(score, 1) ? tone : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-[11px] font-bold text-muted-foreground">
        {STRENGTH_LABELS[score]}
        {error ? ` — ${error}` : ""}
      </p>
    </div>
  );
}
