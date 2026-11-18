import { Trash2, Utensils } from "lucide-react";
import type { Entry } from "@/hooks/use-nutrition";

export function TodayMeals({
  todays,
  onDelete,
}: {
  todays: Entry[];
  onDelete: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        <Utensils className="h-4 w-4" /> وجبات النهارده
      </h3>
      {todays.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          لسه ما سجلتش أكل النهارده.
        </p>
      ) : (
        <ul className="space-y-2">
          {todays.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="rounded-lg bg-primary-soft px-2 py-1 font-bold text-primary">
                {e.meal}
              </span>
              <span className="min-w-0 flex-1 truncate font-bold">{e.name}</span>
              <span className="font-extrabold">{e.calories}</span>
              <button
                type="button"
                aria-label="حذف"
                onClick={() => onDelete(e.id)}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
