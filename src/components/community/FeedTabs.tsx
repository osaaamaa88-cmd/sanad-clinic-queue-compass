import type { FeedTab } from "./community-logic";

export const TABS: { id: FeedTab; label: string }[] = [
  { id: "for_you", label: "لك" },
  { id: "questions", label: "أسئلة" },
  { id: "doctors", label: "أطباء" },
  { id: "following", label: "أتابعهم" },
];

/** Sticky tabs with a sliding indicator (transform only). */
export function FeedTabs({ value, onChange }: { value: FeedTab; onChange: (t: FeedTab) => void }) {
  const index = TABS.findIndex((t) => t.id === value);
  return (
    <div role="tablist" className="relative grid grid-cols-4 border-b border-border">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`min-h-11 text-sm font-extrabold transition-colors ${value === t.id ? "text-foreground" : "text-muted-foreground"}`}
        >
          {t.label}
        </button>
      ))}
      <span
        aria-hidden
        className="community-tab-indicator absolute bottom-0 right-0 h-[3px] w-1/4 rounded-full bg-primary"
        style={{ transform: `translateX(${-index * 100}%)` }}
      />
    </div>
  );
}
