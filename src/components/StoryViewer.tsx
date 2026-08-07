import { useEffect, useRef, useState } from "react";
import { X, Trash2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import type { StoryItem } from "@/lib/stories";

const IMAGE_MS = 5000;

/** Full-screen story viewer with a top progress bar, auto-advance and tap navigation. */
export function StoryViewer({
  items,
  title,
  startIndex = 0,
  isOwner = false,
  onClose,
  onDelete,
}: {
  items: StoryItem[];
  title: string;
  startIndex?: number;
  isOwner?: boolean;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const current = items[index];

  useEffect(() => {
    setProgress(0);
  }, [index]);

  useEffect(() => {
    if (!current) return;
    if (current.mediaType === "video" && current.url) return; // driven by timeupdate
    const started = Date.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / IMAGE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setIndex((i) => (i + 1 < items.length ? i + 1 : (onClose(), i)));
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [current, items.length, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);

  if (!current) return null;

  const next = () => (index + 1 < items.length ? setIndex(index + 1) : onClose());
  const prev = () => setIndex(Math.max(0, index - 1));

  return (
    <div className="fixed inset-0 z-[70] bg-black" dir="rtl">
      {/* progress bars */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2">
        {items.map((s, i) => (
          <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
            <span
              className="block h-full bg-white transition-[width] duration-100"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </span>
        ))}
      </div>

      <div className="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-4 pt-2">
        <p className="truncate text-sm font-extrabold text-white drop-shadow">{title}</p>
        <div className="flex items-center gap-2">
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(current.id)}
              aria-label="حذف الستوري"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* media */}
      <div className="absolute inset-0 grid place-items-center">
        {current.url ? (
          current.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={current.url}
              autoPlay
              playsInline
              controls={false}
              className="max-h-full max-w-full"
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgress((v.currentTime / v.duration) * 100);
              }}
              onEnded={next}
            />
          ) : (
            <img src={current.url} alt={current.caption || title} className="max-h-full max-w-full object-contain" />
          )
        ) : (
          <div
            className={`mx-6 rounded-3xl p-8 text-center ${
              current.kind === "urgent" ? "bg-destructive/20 border border-destructive/50" : "bg-white/10"
            }`}
          >
            {current.kind === "urgent" && <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />}
            <p className="text-xl font-extrabold leading-relaxed text-white">{current.caption}</p>
          </div>
        )}
      </div>

      {current.url && current.caption && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-5 pb-8">
          <p className="text-sm font-bold leading-relaxed text-white">{current.caption}</p>
        </div>
      )}

      {/* tap zones */}
      <button onClick={next} aria-label="التالي" className="absolute bottom-0 left-0 top-14 z-10 w-1/3" />
      <button onClick={prev} aria-label="السابق" className="absolute bottom-0 right-0 top-14 z-10 w-1/3" />
      <div className="pointer-events-none absolute inset-y-0 left-2 z-10 grid place-items-center text-white/40">
        <ChevronLeft className="h-6 w-6" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-2 z-10 grid place-items-center text-white/40">
        <ChevronRight className="h-6 w-6" />
      </div>
    </div>
  );
}