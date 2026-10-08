import { useEffect, useRef, useState } from "react";
import { X, Trash2, AlertTriangle, Send, Eye } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { markStoryViewed, type StoryItem } from "@/lib/stories";

const IMAGE_MS = 5000;
const HOLD_MS = 220;

function timeAgo(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : `منذ ${h} ساعات`;
  const d = Math.floor(h / 24);
  return d === 1 ? "منذ يوم" : `منذ ${d} أيام`;
}

function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("20") ? d : d.startsWith("0") ? `2${d}` : `20${d}`;
}

/** Instagram-style full-screen story viewer: tap, hold-to-pause, swipe-down to close, quick inquiry. */
export function StoryViewer({
  items,
  title,
  startIndex = 0,
  isOwner = false,
  avatar,
  clinicId,
  phone,
  onClose,
  onDelete,
}: {
  items: StoryItem[];
  title: string;
  startIndex?: number;
  isOwner?: boolean;
  avatar?: string;
  clinicId?: string;
  phone?: string;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [msg, setMsg] = useState("");
  const [typing, setTyping] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const press = useRef<{ x: number; y: number; t: number; timer: number } | null>(null);
  const elapsed = useRef(0);
  const current = items[index];
  const isPaused = paused || held || typing;

  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, 220);
  };
  const next = () => (index + 1 < items.length ? setIndex(index + 1) : close());
  const prev = () => setIndex(Math.max(0, index - 1));

  useEffect(() => {
    setProgress(0);
    elapsed.current = 0;
    if (current && !isOwner) markStoryViewed(current.id);
  }, [index, current, isOwner]);

  // image / text timer with pause support
  useEffect(() => {
    if (!current || isPaused) return;
    if (current.mediaType === "video" && current.url) return;
    let last = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      const pct = Math.min(100, (elapsed.current / IMAGE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        setIndex((i) => {
          if (i + 1 < items.length) return i + 1;
          close();
          return i;
        });
      }
    }, 50);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isPaused, items.length]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPaused) v.pause();
    else v.play().catch(() => {});
  }, [isPaused, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const timer = window.setTimeout(() => setHeld(true), HOLD_MS);
    press.current = { x: e.clientX, y: e.clientY, t: Date.now(), timer };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p) return;
    const dy = e.clientY - p.y;
    if (dy > 8) {
      window.clearTimeout(p.timer);
      setPaused(true);
      setDragY(dy);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    const wasHeld = held;
    setHeld(false);
    if (dragY > 0) {
      if (dragY > 110) close();
      else {
        setDragY(0);
        setPaused(false);
      }
      return;
    }
    if (wasHeld || Date.now() - p.t > HOLD_MS) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const onRight = e.clientX - rect.left > rect.width / 2;
    if (onRight) next();
    else prev();
  };

  const contextText = `استفسار بخصوص الستوري${current.tag ? ` (${current.tag})` : ""}${current.caption ? `: «${current.caption.slice(0, 80)}»` : ""}`;
  const sendInquiry = (via: "chat" | "wa") => {
    const text = `${contextText}\n${msg.trim()}`.trim();
    if (via === "wa") {
      const n = waNumber(phone ?? "");
      if (n) window.open(`https://wa.me/${n}?text=${encodeURIComponent(text)}`, "_blank");
      return;
    }
    try {
      sessionStorage.setItem("sanad:chat-draft", text);
    } catch {
      /* ignore */
    }
    if (clinicId) navigate({ to: "/patient/clinic/$id", params: { id: clinicId } });
    onClose();
  };

  const hideUi = held;
  useEffect(() => {
    document.body.dataset.storyOpen = "true";
    return () => { delete document.body.dataset.storyOpen; };
  }, []);
  const scale = 1 - Math.min(dragY, 300) / 1500;

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/95 transition-opacity duration-200"
      style={{ opacity: closing ? 0 : 1 - Math.min(dragY, 400) / 800 }}
      dir="rtl"
    >
      <div
        className="relative h-full w-full max-w-md overflow-hidden bg-black sm:h-[92vh] sm:rounded-3xl"
        style={{
          transform: closing ? "translateY(100%) scale(0.9)" : `translateY(${dragY}px) scale(${scale})`,
          transition: dragY && !closing ? "none" : "transform 260ms cubic-bezier(.2,.9,.3,1.2)",
          borderRadius: dragY ? 24 : undefined,
        }}
      >
        {/* media */}
        <div className="absolute inset-0 grid place-items-center">
          {current.url ? (
            current.mediaType === "video" ? (
              <video
                key={current.id}
                ref={videoRef}
                src={current.url}
                autoPlay
                playsInline
                controls={false}
                className="h-full w-full object-contain"
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setProgress((v.currentTime / v.duration) * 100);
                }}
                onEnded={next}
              />
            ) : (
              <img src={current.url} alt={current.caption || title} className="h-full w-full object-contain" draggable={false} />
            )
          ) : (
            <div className={`mx-6 rounded-3xl p-8 text-center ${current.kind === "urgent" ? "border border-destructive/50 bg-destructive/20" : "bg-white/10"}`}>
              {current.kind === "urgent" && <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />}
              <p className="text-xl font-extrabold leading-relaxed text-white">{current.caption}</p>
            </div>
          )}
        </div>

        {/* gesture surface */}
        <div
          className="absolute inset-x-0 bottom-24 top-16 z-10 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* header */}
        <div className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent pb-6 transition-opacity duration-200 ${hideUi ? "opacity-0" : "opacity-100"}`}>
          <div className="flex gap-1 p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
            {items.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  className="block h-full rounded-full bg-white"
                  style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/70">
                {avatar ? <img src={avatar} alt={title} className="h-full w-full object-cover" /> : <span className="text-sm font-black text-white">{title.replace(/^(دكتوره|دكتور|د\.?)\s*/, "").charAt(0)}</span>}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-white">{title}</p>
                <p className="text-[11px] font-medium text-white/70">{timeAgo(current.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[11px] font-bold text-white">
                  <Eye className="h-3.5 w-3.5" /> {current.views ?? 0}
                </span>
              )}
              {isOwner && onDelete && (
                <button onClick={() => onDelete(current.id)} aria-label="حذف الستوري" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button onClick={close} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* caption + inquiry */}
        <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 transition-opacity duration-200 ${hideUi ? "opacity-0" : "opacity-100"}`}>
          {current.tag && (
            <span className="mb-2 inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold text-primary-foreground">{current.tag}</span>
          )}
          {current.url && current.caption && <p className="mb-3 text-sm font-bold leading-relaxed text-white">{current.caption}</p>}
          {!isOwner && (
            <div className="flex items-center gap-2">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onFocus={() => setTyping(true)}
                onBlur={() => setTyping(false)}
                onKeyDown={(e) => e.key === "Enter" && sendInquiry("chat")}
                placeholder="ارسل استفسار للطبيب…"
                className="h-11 min-w-0 flex-1 rounded-full border border-white/40 bg-transparent px-4 text-sm text-white placeholder:text-white/60 focus:outline-none"
              />
              <button onClick={() => sendInquiry("chat")} aria-label="إرسال داخل التطبيق" className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
                <Send className="h-4 w-4 -scale-x-100" />
              </button>
              {waNumber(phone ?? "") && (
                <button onClick={() => sendInquiry("wa")} aria-label="واتساب" className="h-11 rounded-full bg-white/15 px-3 text-xs font-extrabold text-white">
                  واتساب
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
