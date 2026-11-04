import { Drawer } from "vaul";
import { specialties } from "@/lib/mock-data";

const CATEGORIES = [
  { id: "popular", label: "الشائعة" },
  { id: "surgical", label: "جراحية" },
  { id: "family", label: "أطفال وأسرة" },
  { id: "therapy", label: "علاجات" },
] as const;

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Drawer.Root open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-surface-deep/60" />
        <Drawer.Content
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[85vh] flex-col rounded-t-[28px] border-t border-border bg-card pb-[env(safe-area-inset-bottom)] focus:outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <Drawer.Title className="px-4 py-3 text-center text-base font-extrabold">{title}</Drawer.Title>
          <div className="overflow-y-auto px-4 pb-6">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function FilterSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="تصفية حسب التخصص" onClose={onClose}>
      <button
        type="button"
        onClick={() => onChange("")}
        className={`mb-4 min-h-11 rounded-full border px-4 text-sm font-bold ${!value ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
      >
        كل التخصصات
      </button>
      {CATEGORIES.map((c) => (
        <section key={c.id} className="mb-4">
          <h3 className="mb-2 text-xs font-extrabold text-muted-foreground">{c.label}</h3>
          <div className="flex flex-wrap gap-2">
            {specialties
              .filter((s) => s.category === c.id)
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange(s.id)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-bold ${value === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  {s.emoji} {s.name}
                </button>
              ))}
          </div>
        </section>
      ))}
    </Sheet>
  );
}

export const RULES_KEY = "sanad_community_rules_v1";

export function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="قواعد مجتمع سند" onClose={onClose}>
      <ul className="space-y-3 text-sm leading-relaxed">
        <li>🩺 المجتمع للتوعية فقط ولا يغني عن الكشف الطبي.</li>
        <li>🚑 في الطوارئ اتصل بـ 123 فوراً ومتستناش رد.</li>
        <li>🔒 متنشرش رقمك أو رقمك القومي أو أي بيانات شخصية، وخفي اسمك من صور التحاليل.</li>
        <li>💊 متاخدش جرعة دواء من منشور؛ استشر طبيبك.</li>
        <li>🤝 احترم الكل، والمحتوى المسيء أو المضلل بيتخفى بعد البلاغات.</li>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground"
      >
        فهمت
      </button>
    </Sheet>
  );
}
