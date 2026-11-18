export type SheetBtnTone = "primary" | "warn" | "danger";

export function SheetBtn({
  active,
  onClick,
  tone,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  tone: SheetBtnTone;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const activeCls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "warn"
        ? "bg-warning text-warning-foreground"
        : "bg-destructive text-destructive-foreground";
  const idleCls =
    tone === "primary"
      ? "border border-border bg-card text-primary"
      : tone === "warn"
        ? "border border-border bg-card text-warning"
        : "border border-border bg-card text-destructive";
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold ${
        active ? activeCls : idleCls
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
