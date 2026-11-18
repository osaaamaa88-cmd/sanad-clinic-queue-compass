import { ChevronLeft, ChevronRight, Search } from "lucide-react";

/** زرّا التنقّل بين الصفحات أسفل كل قائمة. */
export function Pager({
  page,
  hasMore,
  onPage,
}: {
  page: number;
  hasMore: boolean;
  onPage: (p: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between text-xs">
      <button
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
      >
        <ChevronRight className="h-3.5 w-3.5" /> السابق
      </button>
      <span className="text-muted-foreground">صفحة {page + 1}</span>
      <button
        disabled={!hasMore}
        onClick={() => onPage(page + 1)}
        className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-bold disabled:opacity-40"
      >
        التالي <ChevronLeft className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** صندوق بحث نصي يُستخدم أعلى قوائم المستخدمين والحجوزات. */
export function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="بحث..."
        className="w-full bg-transparent py-2.5 text-sm outline-none"
      />
    </div>
  );
}
