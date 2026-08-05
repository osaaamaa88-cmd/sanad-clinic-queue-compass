import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Share2, X, ChevronUp, ChevronDown, Send, Trash2, BadgeCheck, Loader2 } from "lucide-react";
import {
  addClinicReply,
  addPostComment,
  deletePostComment,
  getPost,
  postShareUrl,
  shareLink,
  togglePostLike,
  type PostComment,
} from "@/lib/post-social";

export type ViewerPost = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  caption: string;
};

const NAME_KEY = "sandi_commenter_name";

export function PostViewer({
  posts,
  startIndex,
  doctor,
  isVerified,
  isOwner,
  onClose,
}: {
  posts: ViewerPost[];
  startIndex: number;
  doctor: string;
  isVerified?: boolean;
  isOwner?: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const touchY = useRef<number | null>(null);

  const post = posts[index];

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
  }, []);

  const load = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    const data = await getPost(post.id);
    setLikes(data?.likes ?? 0);
    setLiked(Boolean(data?.liked));
    setComments((data?.comments ?? []) as PostComment[]);
    setLoading(false);
  }, [post]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") setIndex((i) => Math.min(posts.length - 1, i + 1));
      if (e.key === "ArrowUp") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, posts.length]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1800);
  };

  const onLike = async () => {
    if (!post) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    const res = await togglePostLike(post.id, next);
    if (res) {
      setLiked(res.liked);
      setLikes(res.likes);
    }
  };

  const onShare = async () => {
    if (!post) return;
    const res = await shareLink({
      title: `${doctor} — سندي`,
      text: post.caption ? `${post.caption}\nمن عيادة ${doctor} على سندي` : `شوف منشور عيادة ${doctor} على سندي`,
      url: postShareUrl(post.id),
    });
    if (res === "copied") flash("تم نسخ رابط المنشور ✅");
  };

  const send = async () => {
    if (!post || !text.trim()) return;
    setBusy(true);
    const body = text.trim();
    const res = isOwner ? await addClinicReply(post.id, body) : await addPostComment(post.id, body, name.trim());
    setBusy(false);
    if (!res) return flash("حصلت مشكلة، حاول تاني");
    if (!isOwner && name.trim()) localStorage.setItem(NAME_KEY, name.trim());
    setComments(res);
    setText("");
  };

  const removeComment = async (id: string) => {
    const res = await deletePostComment(id);
    if (res) setComments(res);
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black" dir="rtl">
      <div
        className="relative h-full w-full"
        onTouchStart={(e) => {
          touchY.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchY.current;
          const end = e.changedTouches[0]?.clientY ?? null;
          touchY.current = null;
          if (start == null || end == null) return;
          const dy = start - end;
          if (Math.abs(dy) < 60) return;
          setIndex((i) => (dy > 0 ? Math.min(posts.length - 1, i + 1) : Math.max(0, i - 1)));
        }}
      >
        {post.mediaType === "video" ? (
          <video
            key={post.id}
            src={post.url}
            className="h-full w-full object-contain"
            autoPlay
            loop
            playsInline
            controls
          />
        ) : (
          <img key={post.id} src={post.url} alt={post.caption || `منشور عيادة ${doctor}`} className="h-full w-full object-contain" />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-sm font-extrabold">{doctor}</span>
            {isVerified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
            <X className="h-5 w-5" />
          </button>
        </div>

        {posts.length > 1 && (
          <div className="absolute left-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label="المنشور السابق"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur disabled:opacity-30"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(posts.length - 1, i + 1))}
              disabled={index === posts.length - 1}
              aria-label="المنشور التالي"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur disabled:opacity-30"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="absolute bottom-24 left-4 flex flex-col items-center gap-4">
          <button onClick={onLike} aria-label="إعجاب" className="flex flex-col items-center gap-1 text-white">
            <span className={`grid h-11 w-11 place-items-center rounded-full backdrop-blur ${liked ? "bg-destructive" : "bg-white/15"}`}>
              <Heart className={`h-5 w-5 ${liked ? "fill-white" : ""}`} />
            </span>
            <span className="text-[11px] font-extrabold">{likes}</span>
          </button>
          <button onClick={() => setShowComments(true)} aria-label="التعليقات" className="flex flex-col items-center gap-1 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-extrabold">{comments.length}</span>
          </button>
          <button onClick={onShare} aria-label="مشاركة" className="flex flex-col items-center gap-1 text-white">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur">
              <Share2 className="h-5 w-5" />
            </span>
            <span className="text-[11px] font-extrabold">مشاركة</span>
          </button>
        </div>

        {post.caption && (
          <p className="absolute bottom-6 right-4 max-w-[70%] text-sm font-bold leading-relaxed text-white">{post.caption}</p>
        )}

        {loading && (
          <div className="absolute bottom-6 left-4 text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {showComments && (
        <div className="absolute inset-0 flex flex-col justify-end bg-black/50" onClick={() => setShowComments(false)}>
          <div
            className="max-h-[75%] rounded-t-3xl border-t border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-extrabold">التعليقات والاستفسارات ({comments.length})</p>
              <button onClick={() => setShowComments(false)} aria-label="إغلاق التعليقات" className="grid h-8 w-8 place-items-center rounded-full bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[38vh] space-y-3 overflow-y-auto pb-2">
              {comments.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">لسه مفيش تعليقات — اكتب استفسارك والعيادة هتردّ عليك.</p>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl border p-3 ${c.isClinicReply ? "border-primary/40 bg-primary-soft" : "border-border bg-secondary/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-extrabold ${c.isClinicReply ? "text-primary" : ""}`}>
                      {c.name}
                      {c.isClinicReply ? " • رد العيادة" : ""}
                    </p>
                    {isOwner && (
                      <button onClick={() => removeComment(c.id)} aria-label="حذف التعليق" className="text-muted-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-2">
              {!isOwner && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك (اختياري)"
                  maxLength={60}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              )}
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  maxLength={500}
                  placeholder={isOwner ? "اكتب ردك على المريض…" : "اكتب استفسارك للعيادة…"}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={send}
                  disabled={busy || !text.trim()}
                  aria-label="إرسال"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl gradient-primary text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                التعليقات للتنظيم والاستفسارات العامة فقط، وليست استشارة طبية.
              </p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
          <span className="rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background">{toast}</span>
        </div>
      )}
    </div>
  );
}
