import { useEffect, useState } from "react";
import { Hospital, Search, X } from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { specialties } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

const specialtyTabs = [
  { id: "popular", label: "الشائعة 🔥" },
  { id: "surgical", label: "جراحية 🩺" },
  { id: "family", label: "أطفال ونساء 👶" },
  { id: "therapy", label: "علاجات وحركة 🦴" },
] as const;

export function AllSpecialtiesSheet({
  counts,
  selected,
  onSelect,
  onClose,
}: {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof specialtyTabs)[number]["id"]>("popular");
  const [closing, setClosing] = useState(false);
  const visibleSpecialties = specialties.filter((specialty) => {
    const normalizedQuery = query.trim().toLowerCase();
    return normalizedQuery
      ? specialty.name.toLowerCase().includes(normalizedQuery)
      : specialty.category === tab;
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  function requestClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 220);
  }

  function chooseSpecialty(id: string) {
    onSelect(id);
    requestClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specialties-title"
    >
      <button
        type="button"
        aria-label="إغلاق التخصصات"
        onClick={requestClose}
        className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
      />
      <section
        className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-t-2xl border border-border bg-card shadow-gold ${closing ? "animate-sheet-down" : "animate-sheet-up"}`}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 pb-4 pt-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="specialties-title" className="text-lg font-extrabold">
              كل التخصصات الطبية
            </h2>
            <p className="text-xs text-muted-foreground">اختار التخصص المناسب ليظهر أطباؤه فوراً</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={requestClose}
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="max-h-[calc(88vh-78px)] overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
            <Search className="h-5 w-5 shrink-0 text-primary" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث عن تخصص…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </label>
          <div
            className="mt-4 flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="فئات التخصصات"
          >
            {specialtyTabs.map((item) => (
              <Button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                variant={tab === item.id ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  setTab(item.id);
                  setQuery("");
                }}
                className="shrink-0 rounded-full"
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleSpecialties.map((specialty) => {
              const SpecialtyIcon = specialtyIcons[specialty.id] ?? Hospital;
              const isSelected = selected === specialty.id;
              return (
                <Button
                  key={specialty.id}
                  type="button"
                  variant="ghost"
                  onClick={() => chooseSpecialty(specialty.id)}
                  className={`min-h-20 min-w-0 items-start justify-start gap-3 whitespace-normal rounded-xl border p-3 text-right transition active:scale-[0.97] ${isSelected ? "border-primary bg-primary-soft/30 shadow-soft" : "border-border bg-background hover:border-primary/50 hover:bg-background"}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <SpecialtyIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold leading-5 break-words sm:text-sm">
                      {specialty.name}
                    </span>
                    <span className="block text-xs leading-4 text-muted-foreground">
                      {counts[specialty.id] ?? 0} عيادة مفتوحة
                    </span>
                  </span>
                </Button>
              );
            })}
            {visibleSpecialties.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                لا يوجد تخصص بهذا الاسم
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
