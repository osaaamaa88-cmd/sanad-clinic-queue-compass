import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Bookmark,
  CalendarPlus,
  Clock,
  EyeOff,
  Flag,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { getSpecialty } from "@/lib/mock-data";
import { timeAgo, type FeedPost } from "./community-logic";

export type PostActions = {
  onLike: (p: FeedPost) => void;
  onSave: (p: FeedPost) => void;
  onShare: (p: FeedPost) => void;
  onComments: (p: FeedPost) => void;
  onHide: (p: FeedPost) => void;
  onReport: (p: FeedPost) => void;
  onDelete: (p: FeedPost) => void;
};

export function PostCard({
  post,
  image,
  reveal,
  actions,
}: {
  post: FeedPost;
  image?: string;
  reveal: boolean;
  actions: PostActions;
}) {
  const [menu, setMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [pop, setPop] = useState(false);
  const lastTap = useRef(0);
  const spec = getSpecialty(post.specialty_id);
  const isDoctorPost = !!post.clinic_id && !!post.doctor_name;
  const long = post.body.length > 320 || post.body.split("\n").length > 6;
  const top = post.top_doctor_comment;

  const like = () => {
    if (!post.my_liked) {
      setPop(true);
      window.setTimeout(() => setPop(false), 240);
    }
    actions.onLike(post);
  };

  const onImageTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.my_liked) like();
      lastTap.current = 0;
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current === now) setViewer(true);
    }, 310);
  };

  const name = (
    <span className="truncate text-sm font-extrabold">{isDoctorPost ? post.doctor_name : post.author_name}</span>
  );

  return (
    <article
      id={`post-${post.id}`}
      className={`scroll-mt-28 border-b border-border py-3 ${reveal ? "community-reveal" : ""}`}
    >
      <header className="flex items-center gap-3 px-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-black ${isDoctorPost ? "gradient-gold text-gold-foreground" : post.is_anonymous ? "bg-secondary text-muted-foreground" : "bg-primary-soft text-primary"}`}
        >
          {isDoctorPost && post.doctor_avatar ? (
            <img src={post.doctor_avatar} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : post.is_anonymous ? (
            <Lock className="h-4 w-4" />
          ) : (
            post.author_name.replace(/^د\.?\s*/, "").charAt(0)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isDoctorPost ? (
              <Link to="/patient/clinic/$id" params={{ id: post.clinic_id! }} className="truncate">
                {name}
              </Link>
            ) : (
              name
            )}
            {isDoctorPost && <BadgeCheck className="h-4 w-4 shrink-0 text-success" aria-label="طبيب موثّق" />}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {timeAgo(post.created_at)}
            {spec ? ` · ${spec.emoji} ${spec.name}` : ""}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="خيارات"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
            className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="إغلاق" className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div className="absolute left-0 top-12 z-40 w-48 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-soft">
                {[
                  { icon: Bookmark, label: post.my_saved ? "إلغاء الحفظ" : "حفظ", fn: actions.onSave },
                  { icon: Share2, label: "مشاركة / نسخ الرابط", fn: actions.onShare },
                  { icon: EyeOff, label: "إخفاء المنشور", fn: actions.onHide },
                  ...(!post.is_mine ? [{ icon: Flag, label: "إبلاغ", fn: actions.onReport }] : []),
                  ...(post.is_mine ? [{ icon: Trash2, label: "حذف", fn: actions.onDelete }] : []),
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      item.fn(post);
                    }}
                    className="flex min-h-11 w-full items-center gap-2 px-4 text-right text-sm font-bold hover:bg-secondary"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {post.kind === "card" ? (
        <div
          className={`card-bg-${post.bg_style || "navy"} card-ink mx-4 mt-3 grid min-h-56 place-items-center rounded-2xl px-6 py-10 text-center`}
        >
          <p className={`font-card-${post.font_style || "alexandria"} whitespace-pre-wrap text-2xl leading-relaxed`}>
            {post.body}
          </p>
        </div>
      ) : (
        <>
          {post.body && (
            <div className="px-4 pt-2">
              <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${!expanded && long ? "line-clamp-6" : ""}`}>
                {post.body}
              </p>
              {long && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="min-h-11 text-sm font-bold text-muted-foreground"
                >
                  اقرأ المزيد
                </button>
              )}
            </div>
          )}
          {post.image_path && post.kind === "voice" && (
            <div className="px-4 pt-2">
              {image ? <audio src={image} controls preload="none" className="h-11 w-full" /> : <div className="community-skeleton h-11 w-full rounded-full" />}
            </div>
          )}
          {post.image_path && post.kind !== "voice" && (
            <button type="button" onClick={onImageTap} className="relative mt-2 block w-full" aria-label="عرض الصورة">
              {image ? (
                <img src={image} alt="صورة مرفقة" loading="lazy" className="max-h-[28rem] w-full bg-secondary object-contain" />
              ) : (
                <div className="community-skeleton h-60 w-full" />
              )}
              {pop && (
                <Heart className="community-pop pointer-events-none absolute inset-0 m-auto h-20 w-20 fill-destructive text-destructive" />
              )}
            </button>
          )}
        </>
      )}

      {!isDoctorPost && (
        <div className="px-4 pt-2">
          {post.answered_by_doctor ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
              <BadgeCheck className="h-3.5 w-3.5" /> تمت الإجابة
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> بانتظار رد طبيب
            </span>
          )}
        </div>
      )}

      {top && (
        <div className="mx-4 mt-2 rounded-2xl border border-gold/40 bg-gold-soft p-3">
          <div className="flex items-center gap-1.5 text-xs font-extrabold">
            <BadgeCheck className="h-4 w-4 text-success" />
            إجابة طبيب ·{" "}
            <Link to="/patient/clinic/$id" params={{ id: top.clinic_id }} className="underline-offset-2 hover:underline">
              {top.author_name}
            </Link>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed">{top.body}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => actions.onComments(post)}
              className="min-h-11 rounded-full border border-border bg-card px-3 text-xs font-bold"
            >
              عرض الإجابة الكاملة
            </button>
            <Link
              to="/patient/clinic/$id"
              params={{ id: top.clinic_id }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground"
            >
              <CalendarPlus className="h-4 w-4" /> احجز
            </Link>
          </div>
        </div>
      )}

      <div className="mt-1 flex items-center px-2">
        <button
          type="button"
          onClick={like}
          aria-pressed={post.my_liked}
          aria-label="مفيد"
          className={`flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold ${post.my_liked ? "text-destructive" : "text-muted-foreground"}`}
        >
          <Heart className={`h-5 w-5 ${post.my_liked ? "fill-current" : ""} ${pop ? "community-pop" : ""}`} />
          مفيد
        </button>
        <button
          type="button"
          onClick={() => actions.onComments(post)}
          aria-label="التعليقات"
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-muted-foreground"
        >
          <MessageCircle className="h-5 w-5" /> تعليق
        </button>
        <button
          type="button"
          onClick={() => actions.onShare(post)}
          aria-label="مشاركة"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground"
        >
          <Share2 className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => actions.onSave(post)}
          aria-pressed={post.my_saved}
          aria-label="حفظ"
          className={`mr-auto grid h-11 w-11 place-items-center rounded-full ${post.my_saved ? "text-primary" : "text-muted-foreground"}`}
        >
          <Bookmark className={`h-5 w-5 ${post.my_saved ? "fill-current" : ""}`} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => actions.onComments(post)}
        className="min-h-8 px-4 text-xs font-bold text-muted-foreground"
      >
        {post.likes_count} مفيد · {post.comments_count} تعليقات
      </button>

      {viewer && image && (
        <div className="fixed inset-0 z-[140] bg-surface-deep" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setViewer(false)}
            aria-label="إغلاق"
            className="absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid h-11 w-11 place-items-center rounded-full bg-background/80"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="h-full w-full overflow-auto [touch-action:pinch-zoom]">
            <img src={image} alt="صورة مرفقة" className="mx-auto min-h-full w-full object-contain" />
          </div>
        </div>
      )}
    </article>
  );
}
