import type { Dispatch, RefObject, SetStateAction } from "react";
import { X } from "lucide-react";
import { createHighlight, pinStoriesToHighlight, type ClinicStories } from "@/lib/stories";

export function NewHighlightModal({
  id,
  stories,
  hlTitle,
  setHlTitle,
  hlEmoji,
  hlPicked,
  setHlPicked,
  hlMsg,
  setHlMsg,
  busy,
  setBusy,
  setNewHighlight,
  storyTargetHighlight,
  storyInputRef,
  refreshStories,
}: {
  id: string;
  stories: ClinicStories;
  hlTitle: string;
  setHlTitle: (v: string) => void;
  hlEmoji: string;
  hlPicked: string[];
  setHlPicked: Dispatch<SetStateAction<string[]>>;
  hlMsg: string;
  setHlMsg: (v: string) => void;
  busy: string | null;
  setBusy: (v: string | null) => void;
  setNewHighlight: (v: boolean) => void;
  storyTargetHighlight: { current: string | null };
  storyInputRef: RefObject<HTMLInputElement | null>;
  refreshStories: () => Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/70 sm:items-center sm:justify-center"
      onClick={() => setNewHighlight(false)}
    >
      <div
        className="w-full rounded-t-3xl border border-border bg-card p-5 sm:max-w-sm sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-base font-extrabold">هايلايت جديد</p>
          <button
            onClick={() => setNewHighlight(false)}
            aria-label="إغلاق"
            className="grid h-11 w-11 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="text-xs font-bold text-muted-foreground">اسم الهايلايت</label>
        <input
          value={hlTitle}
          onChange={(ev) => setHlTitle(ev.target.value)}
          placeholder="مثال: قبل وبعد"
          className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-gold"
        />
        {stories.stories.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-4 text-center">
            <p className="text-sm font-bold">لازم تنشر ستوري واحدة على الأقل الأول</p>
            <p className="mt-1 text-xs text-muted-foreground">
              الهايلايت بيتعمل من الستوريز اللي نشرتها، زي إنستجرام.
            </p>
            <button
              onClick={() => {
                setNewHighlight(false);
                storyTargetHighlight.current = null;
                storyInputRef.current?.click();
              }}
              className="mt-3 rounded-xl gradient-gold px-4 py-2 text-xs font-extrabold text-gold-foreground"
            >
              نشر ستوري الآن
            </button>
          </div>
        ) : (
          <>
            <label className="mt-4 block text-xs font-bold text-muted-foreground">
              اختار الستوريز ({hlPicked.length})
            </label>
            <div className="mt-2 grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
              {stories.stories.map((st) => {
                const idx = hlPicked.indexOf(st.id);
                return (
                  <button
                    key={st.id}
                    onClick={() =>
                      setHlPicked((p) => (idx >= 0 ? p.filter((x) => x !== st.id) : [...p, st.id]))
                    }
                    className={`relative aspect-[9/16] overflow-hidden rounded-lg bg-secondary ${idx >= 0 ? "ring-2 ring-gold" : ""}`}
                  >
                    {st.url && st.mediaType === "image" ? (
                      <img
                        src={st.url}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : st.url ? (
                      <video
                        src={st.url}
                        muted
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center p-1 text-xs font-bold">
                        {st.caption}
                      </span>
                    )}
                    <span
                      className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white text-xs font-black ${idx >= 0 ? "bg-gold text-gold-foreground" : "bg-black/30"}`}
                    >
                      {idx >= 0 ? idx + 1 : ""}
                    </span>
                    {idx === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-xs font-bold text-white">
                        الغلاف
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              أول ستوري تختارها هتبقى غلاف الهايلايت.
            </p>
          </>
        )}
        {hlMsg && <p className="mt-2 text-xs font-bold text-destructive">{hlMsg}</p>}
        <button
          disabled={!hlTitle.trim() || hlPicked.length === 0 || busy === "hl"}
          onClick={async () => {
            setBusy("hl");
            setHlMsg("");
            const first = stories.stories.find((x) => x.id === hlPicked[0]);
            const newId = await createHighlight(
              id,
              hlTitle.trim(),
              first?.mediaType === "image" ? "📸" : hlEmoji,
            );
            const ok = newId ? await pinStoriesToHighlight(newId, hlPicked) : false;
            setBusy(null);
            if (ok) {
              setHlTitle("");
              setHlPicked([]);
              setNewHighlight(false);
              await refreshStories();
            } else setHlMsg("تعذر إنشاء الهايلايت، حاول تاني.");
          }}
          className="mt-4 w-full rounded-2xl gradient-gold py-3.5 text-sm font-extrabold text-gold-foreground disabled:opacity-50"
        >
          {busy === "hl" ? "جاري الحفظ…" : "إنشاء الهايلايت"}
        </button>
      </div>
    </div>
  );
}
