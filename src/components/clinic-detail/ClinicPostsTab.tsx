import type { Dispatch, RefObject, SetStateAction } from "react";
import { Camera, Heart, ImagePlus, Loader2, MessageCircle, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteHighlight, type ClinicStories, type StoryItem } from "@/lib/stories";
import { deleteClinicPost, type ClinicProfileExtras } from "@/lib/clinic-profile";
import type { PostSocial } from "@/lib/post-social";
import type { Clinic } from "@/lib/mock-data";

export function ClinicPostsTab({
  tab,
  clinic,
  stories,
  isOwner,
  extras,
  social,
  busy,
  setBusy,
  postInputRef,
  storyInputRef,
  storyTargetHighlight,
  setViewerIndex,
  setStoryView,
  setHlPicked,
  setHlMsg,
  setNewHighlight,
  refreshStories,
  refreshExtras,
}: {
  tab: "posts" | "reels";
  clinic: Clinic;
  stories: ClinicStories;
  isOwner: boolean;
  extras: ClinicProfileExtras | null;
  social: PostSocial;
  busy: string | null;
  setBusy: (v: string | null) => void;
  postInputRef: RefObject<HTMLInputElement | null>;
  storyInputRef: RefObject<HTMLInputElement | null>;
  storyTargetHighlight: { current: string | null };
  setViewerIndex: (i: number | null) => void;
  setStoryView: (v: { items: StoryItem[]; title: string } | null) => void;
  setHlPicked: Dispatch<SetStateAction<string[]>>;
  setHlMsg: (v: string) => void;
  setNewHighlight: (v: boolean) => void;
  refreshStories: () => Promise<void>;
  refreshExtras: () => Promise<void>;
}) {
  return (
    <div className="mt-0.5">
      {tab === "posts" && (stories.highlights.length > 0 || isOwner) && (
        <section className="mb-4 -mx-4 border-b border-border/70 px-4 pb-3 sm:mx-0 sm:px-0">
          <h2 className="mb-2 text-sm font-extrabold">أبرز القصص</h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {isOwner && (
              <button
                type="button"
                onClick={() => {
                  setHlPicked([]);
                  setHlMsg("");
                  setNewHighlight(true);
                }}
                className="flex min-h-11 shrink-0 flex-col items-center text-center"
                aria-label="هايلايت جديد"
              >
                <span className="grid h-[68px] w-[68px] place-items-center rounded-full border-2 border-dashed border-border bg-card text-foreground">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="mt-1.5 block max-w-[68px] truncate text-xs font-bold text-gold">
                  هايلايت جديد
                </span>
              </button>
            )}
            {stories.highlights.map((highlight) => (
              <div key={highlight.id} className="relative shrink-0 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (highlight.items.length) {
                      setStoryView({ items: highlight.items, title: highlight.title });
                    } else if (isOwner) {
                      storyTargetHighlight.current = highlight.id;
                      storyInputRef.current?.click();
                    }
                  }}
                  className="flex min-h-11 flex-col items-center"
                >
                  <span className="block h-[68px] w-[68px] rounded-full border border-border p-[3px]">
                    <span className="relative grid h-full w-full place-items-center overflow-hidden rounded-full bg-secondary text-2xl">
                      {highlight.items[0]?.url && highlight.items[0].mediaType === "image" ? (
                        <img
                          src={highlight.items[0].url}
                          alt={highlight.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        highlight.emoji
                      )}
                    </span>
                  </span>
                  <span className="mt-1.5 block max-w-[68px] truncate text-xs font-semibold text-foreground">
                    {highlight.title}
                  </span>
                </button>
                {isOwner && (
                  <span className="mt-1 flex justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        storyTargetHighlight.current = highlight.id;
                        storyInputRef.current?.click();
                      }}
                      aria-label={`إضافة قصة إلى ${highlight.title}`}
                      className="grid h-11 w-11 place-items-center rounded-full gradient-gold text-gold-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`هل تريد حذف هايلايت «${highlight.title}»؟`)) return;
                        try {
                          if (await deleteHighlight(highlight.id)) await refreshStories();
                          else toast.error("تعذر حذف الهايلايت.");
                        } catch (error) {
                          console.error("[ClinicDetail] Failed to delete highlight:", error);
                          toast.error("تعذر حذف الهايلايت.");
                        }
                      }}
                      aria-label={`حذف ${highlight.title}`}
                      className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {(extras?.posts ?? []).filter((p) =>
        tab === "reels" ? p.mediaType === "video" : p.mediaType !== "video",
      ).length === 0 ? (
        <div className="py-12 text-center">
          <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">
            {tab === "reels" ? "لسه مفيش فيديوهات" : "لسه مفيش منشورات"}
          </p>
          {isOwner && (
            <button
              onClick={() => postInputRef.current?.click()}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground"
            >
              <ImagePlus className="me-1 inline h-4 w-4" /> إضافة منشور
            </button>
          )}
        </div>
      ) : (
        <div className="-mx-4 grid grid-cols-3 gap-[3px] sm:mx-0">
          {(extras?.posts ?? [])
            .map((p, i) => ({ p, i }))
            .filter(({ p }) =>
              tab === "reels" ? p.mediaType === "video" : p.mediaType !== "video",
            )
            .map(({ p, i }) => (
              <div
                key={p.id}
                className={`relative overflow-hidden bg-surface-deep ${tab === "reels" ? "aspect-[9/16]" : "aspect-square"}`}
              >
                <button
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  aria-label={p.mediaType === "video" ? "تشغيل الفيديو" : "فتح المنشور"}
                  className="absolute inset-0 z-0 h-full w-full"
                >
                  {p.mediaType === "video" ? (
                    <>
                      <video src={p.url} className="h-full w-full object-cover" muted playsInline />
                      <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-background/70 text-gold">
                        <Play className="h-3 w-3" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={p.url}
                      alt={p.caption || `منشور من عيادة ${clinic.doctor}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
                {isOwner && (
                  <button
                    type="button"
                    aria-label="حذف المنشور"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!window.confirm("هل تريد حذف هذا المنشور؟")) return;
                      setBusy(p.id);
                      try {
                        if (await deleteClinicPost(p.id)) await refreshExtras();
                        else toast.error("تعذر حذف المنشور.");
                      } catch (error) {
                        console.error("[ClinicDetail] Failed to delete clinic post:", error);
                        toast.error("تعذر حذف المنشور.");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="absolute bottom-1.5 left-1.5 z-10 grid h-11 w-11 place-items-center rounded-full bg-background/90 text-destructive"
                  >
                    {busy === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
                <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-2 rounded-full bg-background/70 px-2 py-0.5 text-xs font-extrabold backdrop-blur">
                  <span
                    className={`flex items-center gap-0.5 ${social.liked[p.id] ? "text-destructive" : ""}`}
                  >
                    <Heart className={`h-3 w-3 ${social.liked[p.id] ? "fill-current" : ""}`} />{" "}
                    {social.likes[p.id] ?? 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="h-3 w-3" /> {social.comments[p.id] ?? 0}
                  </span>
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
