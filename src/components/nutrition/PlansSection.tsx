import { Copy } from "lucide-react";
import { toast } from "sonner";
import { PLANS } from "@/lib/nutrition-plans";

export function PlansSection() {
  return (
    <section>
      <h3 className="mb-2 text-sm font-extrabold">أنظمة غذائية جاهزة (للمرضى والأطباء)</h3>
      <div className="space-y-2">
        {PLANS.map((p) => (
          <details key={p.t} className="rounded-2xl border border-border bg-card p-3">
            <summary className="cursor-pointer text-sm font-bold">{p.t}</summary>
            <p className="mt-2 whitespace-pre-line text-xs leading-6 text-muted-foreground">
              {p.d}
            </p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(`${p.t}\n${p.d}`);
                toast.success("اتنسخ — ابعته للمريض في الرسائل");
              }}
              className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"
            >
              <Copy className="h-3.5 w-3.5" /> نسخ للمشاركة
            </button>
          </details>
        ))}
      </div>
    </section>
  );
}
