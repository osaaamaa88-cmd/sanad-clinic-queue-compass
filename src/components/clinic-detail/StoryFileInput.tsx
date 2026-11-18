import type { RefObject } from "react";
import { addStory } from "@/lib/stories";

export function StoryFileInput({
  id,
  storyInputRef,
  storyTargetHighlight,
  setPendingStory,
  setStoryHours,
  setBusy,
  setShareToast,
  refreshStories,
}: {
  id: string;
  storyInputRef: RefObject<HTMLInputElement | null>;
  storyTargetHighlight: { current: string | null };
  setPendingStory: (v: { file: File; url: string } | null) => void;
  setStoryHours: (v: 12 | 24) => void;
  setBusy: (v: string | null) => void;
  setShareToast: (v: string) => void;
  refreshStories: () => Promise<void>;
}) {
  return (
    <input
      ref={storyInputRef}
      type="file"
      accept="image/*,video/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!storyTargetHighlight.current) {
          setPendingStory({ file, url: URL.createObjectURL(file) });
          setStoryHours(24);
          return;
        }
        setBusy("story");
        const res = await addStory({
          clinicId: id,
          file,
          highlightId: storyTargetHighlight.current,
          permanent: true,
        });
        storyTargetHighlight.current = null;
        setBusy(null);
        setShareToast(res.ok ? "اتضافت للهايلايت ✅" : "الرفع فشل، جرب صورة أصغر");
        window.setTimeout(() => setShareToast(""), 2500);
        if (res.ok) await refreshStories();
      }}
    />
  );
}
