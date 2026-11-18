import type { RefObject } from "react";
import { AlertTriangle, Camera, ImagePlus, Sparkles } from "lucide-react";

export function CreateSheet({
  setCreateSheet,
  storyTargetHighlight,
  storyInputRef,
  setUrgentOpen,
  setHlPicked,
  setHlMsg,
  setNewHighlight,
  postInputRef,
}: {
  setCreateSheet: (v: boolean) => void;
  storyTargetHighlight: { current: string | null };
  storyInputRef: RefObject<HTMLInputElement | null>;
  setUrgentOpen: (v: boolean) => void;
  setHlPicked: (v: string[]) => void;
  setHlMsg: (v: string) => void;
  setNewHighlight: (v: boolean) => void;
  postInputRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/70 backdrop-blur-sm"
      onClick={() => setCreateSheet(false)}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <p className="mb-2 text-center text-sm font-black">إنشاء</p>
        {(
          [
            [
              Camera,
              "قصة (ستوري)",
              "تختفي بعد ١٢ أو ٢٤ ساعة",
              () => {
                storyTargetHighlight.current = null;
                storyInputRef.current?.click();
              },
            ],
            [AlertTriangle, "تنبيه عاجل", "ستوري نصية للمتابعين", () => setUrgentOpen(true)],
            [
              Sparkles,
              "هايلايت جديد",
              "قصص دائمة على البروفايل",
              () => {
                setHlPicked([]);
                setHlMsg("");
                setNewHighlight(true);
              },
            ],
            [ImagePlus, "منشور", "صورة أو فيديو في الشبكة", () => postInputRef.current?.click()],
          ] as const
        ).map(([Icon, l, d, fn]) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setCreateSheet(false);
              fn();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right hover:bg-secondary"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">{l}</span>
              <span className="block text-xs text-muted-foreground">{d}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
