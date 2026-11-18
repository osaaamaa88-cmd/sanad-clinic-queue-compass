import { X } from "lucide-react";
import { addStory } from "@/lib/stories";

export function UrgentAlertModal({
  id,
  urgentText,
  setUrgentText,
  setUrgentOpen,
  busy,
  setBusy,
  refreshStories,
}: {
  id: string;
  urgentText: string;
  setUrgentText: (v: string) => void;
  setUrgentOpen: (v: boolean) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  refreshStories: () => Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/70 sm:items-center sm:justify-center"
      onClick={() => setUrgentOpen(false)}
    >
      <div
        className="w-full rounded-t-3xl border border-border bg-card p-5 sm:max-w-sm sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-extrabold text-destructive">تنبيه عاجل</p>
          <button
            onClick={() => setUrgentOpen(false)}
            aria-label="إغلاق"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          هيوصل إشعار لكل متابعي العيادة، ويختفي بعد ٢٤ ساعة.
        </p>
        <textarea
          value={urgentText}
          onChange={(ev) => setUrgentText(ev.target.value)}
          rows={3}
          placeholder="مثال: العيادة مقفولة النهارده لطارئ."
          className="mt-3 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-destructive"
        />
        <button
          disabled={!urgentText.trim() || busy === "urgent"}
          onClick={async () => {
            setBusy("urgent");
            const res = await addStory({
              clinicId: id,
              caption: urgentText.trim(),
              kind: "urgent",
            });
            setBusy(null);
            if (res.ok) {
              setUrgentText("");
              setUrgentOpen(false);
              await refreshStories();
            }
          }}
          className="mt-4 w-full rounded-2xl bg-destructive py-3.5 text-sm font-extrabold text-white disabled:opacity-50"
        >
          {busy === "urgent" ? "جاري النشر…" : "نشر التنبيه"}
        </button>
      </div>
    </div>
  );
}
