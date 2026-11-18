import { Clock3, Loader2, X } from "lucide-react";
import { addStory } from "@/lib/stories";

export function PendingStoryModal({
  id,
  pendingStory,
  setPendingStory,
  storyHours,
  setStoryHours,
  busy,
  setBusy,
  setShareToast,
  refreshStories,
}: {
  id: string;
  pendingStory: { file: File; url: string };
  setPendingStory: (v: { file: File; url: string } | null) => void;
  storyHours: 12 | 24;
  setStoryHours: (v: 12 | 24) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  setShareToast: (v: string) => void;
  refreshStories: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="إلغاء"
            onClick={() => {
              URL.revokeObjectURL(pendingStory.url);
              setPendingStory(null);
            }}
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm font-black">قصة جديدة</p>
          <span className="w-8" />
        </div>
        <div className="mx-auto mt-3 aspect-[9/16] max-h-[45vh] overflow-hidden rounded-2xl bg-surface-deep">
          {pendingStory.file.type.startsWith("video") ? (
            <video
              src={pendingStory.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
              loop
            />
          ) : (
            <img src={pendingStory.url} alt="معاينة القصة" className="h-full w-full object-cover" />
          )}
        </div>
        <p className="mt-4 text-xs font-bold text-muted-foreground">مدة ظهور القصة</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([12, 24] as const).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setStoryHours(h)}
              className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-extrabold ${storyHours === h ? "border-primary bg-primary/15 text-primary" : "border-border text-foreground"}`}
            >
              <Clock3 className="h-4 w-4" /> {h === 12 ? "١٢ ساعة" : "٢٤ ساعة"}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy === "story"}
          onClick={async () => {
            setBusy("story");
            const res = await addStory({
              clinicId: id,
              file: pendingStory.file,
              highlightId: null,
              durationHours: storyHours,
            });
            setBusy(null);
            URL.revokeObjectURL(pendingStory.url);
            setPendingStory(null);
            setShareToast(
              res.ok
                ? `تم نشر القصة لمدة ${storyHours === 12 ? "١٢" : "٢٤"} ساعة ✅`
                : "الرفع فشل، جرب صورة أصغر",
            );
            window.setTimeout(() => setShareToast(""), 2500);
            if (res.ok) await refreshStories();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-60"
        >
          {busy === "story" && <Loader2 className="h-4 w-4 animate-spin" />} نشر لمدة{" "}
          {storyHours === 12 ? "١٢" : "٢٤"} ساعة
        </button>
      </div>
    </div>
  );
}
