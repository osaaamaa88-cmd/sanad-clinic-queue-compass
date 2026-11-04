import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { BadgeCheck, CalendarPlus, CornerDownLeft, Flag, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMMENTS_PAGE, fetchComments, type CommunityComment } from "./community-api";
import { detectPersonalData, PERSONAL_DATA_LABEL, sortComments, timeAgo } from "./community-logic";

export function CommentsSheet({
  postId,
  userId,
  authorName,
  clinicId,
  onClose,
  requireAuth,
  onReport,
  onCountChange,
}: {
  postId: string;
  userId: string | null;
  authorName: string;
  clinicId: string | null;
  onClose: () => void;
  requireAuth: () => boolean;
  onReport: (commentId: string) => void;
  onCountChange: (delta: number) => void;
}) {
  const [items, setItems] = useState<CommunityComment[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<{ rootId: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetchComments(postId, page)
      .then((rows) => {
        setItems((s) => (page === 0 ? rows : [...s, ...rows]));
        setMore(rows.length === COMMENTS_PAGE);
      })
      .catch(() => toast.error("تعذّر تحميل التعليقات"))
      .finally(() => setLoading(false));
  }, [postId, page]);

  const sorted = useMemo(() => sortComments(items.filter((c) => !c.parent_id)), [items]);
  const repliesOf = useMemo(() => {
    const m: Record<string, CommunityComment[]> = {};
    for (const c of items) if (c.parent_id) (m[c.parent_id] ??= []).push(c);
    for (const k in m) m[k].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return m;
  }, [items]);

  const startReply = (c: CommunityComment) => {
    if (!requireAuth()) return;
    const name = c.is_doctor ? c.doctor_name || c.author_name : c.author_name || "عضو";
    setReplyTo({ rootId: c.parent_id ?? c.id, name });
    setText((t) => (t.startsWith("@") ? t : `@${name} `));
    setExpanded((e) => ({ ...e, [c.parent_id ?? c.id]: true }));
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };
  const pii = detectPersonalData(text);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending || pii.length) return;
    if (!requireAuth()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        author_id: userId!,
        author_name: authorName,
        clinic_id: clinicId,
        body: text.trim().slice(0, 1000),
        parent_id: replyTo?.rootId ?? null,
      })
      .select("id, post_id, author_id, author_name, clinic_id, body, created_at, parent_id")
      .single();
    setSending(false);
    if (error || !data) return void toast.error("تعذّر إرسال التعليق");
    setItems((s) => [
      { ...data, is_doctor: !!data.clinic_id, doctor_name: data.author_name },
      ...s,
    ]);
    onCountChange(1);
    setText("");
    setReplyTo(null);
  };

  const remove = async (c: CommunityComment) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", c.id);
    if (error) return void toast.error("تعذّر الحذف");
    const gone = 1 + (c.parent_id ? 0 : (repliesOf[c.id]?.length ?? 0));
    setItems((s) => s.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    onCountChange(-gone);
  };

  const renderComment = (c: CommunityComment) => (
    <div
      className={`rounded-2xl p-3 ${c.is_doctor ? "border border-gold/40 bg-gold-soft" : "bg-secondary"}`}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold">
        {c.is_doctor && c.clinic_id ? (
          <Link to="/patient/clinic/$id" params={{ id: c.clinic_id }} className="font-extrabold">
            {c.doctor_name || c.author_name}
          </Link>
        ) : (
          <span>{c.author_name || "عضو"}</span>
        )}
        {c.is_doctor && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
            <BadgeCheck className="h-3.5 w-3.5" /> إجابة طبيب
          </span>
        )}
        <span className="font-medium text-muted-foreground">· {timeAgo(c.created_at)}</span>
        {userId === c.author_id ? (
          <button
            type="button"
            onClick={() => void remove(c)}
            aria-label="حذف التعليق"
            className="mr-auto grid h-11 w-11 place-items-center text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReport(c.id)}
            aria-label="الإبلاغ عن التعليق"
            className="mr-auto grid h-11 w-11 place-items-center text-muted-foreground"
          >
            <Flag className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
      <button
        type="button"
        onClick={() => startReply(c)}
        className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-muted-foreground"
      >
        <CornerDownLeft className="h-3.5 w-3.5" /> رد
      </button>
      {c.is_doctor && c.clinic_id && (
        <Link
          to="/patient/clinic/$id"
          params={{ id: c.clinic_id }}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground"
        >
          <CalendarPlus className="h-4 w-4" /> احجز
        </Link>
      )}
    </div>
  );

  return (
    <Drawer.Root open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-surface-deep/60" />
        <Drawer.Content
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-[101] flex h-[85vh] flex-col rounded-t-[28px] border-t border-border bg-card focus:outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <Drawer.Title className="px-4 py-3 text-center text-base font-extrabold">
            التعليقات
          </Drawer.Title>
          <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4">
            {!loading && sorted.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                لا توجد تعليقات بعد. كن أول من يرد.
              </p>
            )}
            {sorted.map((c) => {
              const reps = repliesOf[c.id] ?? [];
              const open = expanded[c.id] || reps.length <= 2;
              const shown = open ? reps : reps.slice(0, 1);
              return (
                <div key={c.id}>
                  {renderComment(c)}
                  {reps.length > 0 && (
                    <div className="mr-4 mt-2 space-y-2 border-r-2 border-border pr-3">
                      {shown.map((r) => (
                        <div key={r.id}>{renderComment(r)}</div>
                      ))}
                      {!open && (
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => ({ ...e, [c.id]: true }))}
                          className="min-h-11 text-xs font-bold text-primary"
                        >
                          عرض {reps.length - shown.length} ردود أخرى
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && <div className="community-skeleton h-16 rounded-2xl" />}
            {more && !loading && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="min-h-11 w-full rounded-xl text-sm font-bold text-primary"
              >
                تحميل المزيد
              </button>
            )}
          </div>
          <form
            onSubmit={send}
            className="border-t border-border bg-card p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
          >
            {pii.length > 0 && (
              <p className="mb-2 text-xs font-bold text-destructive">
                احذف {pii.map((k) => PERSONAL_DATA_LABEL[k]).join("، ")} قبل الإرسال لحماية خصوصيتك.
              </p>
            )}
            {replyTo && (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-secondary px-3 text-xs font-bold">
                <span>الرد على {replyTo.name}</span>
                <button
                  type="button"
                  aria-label="إلغاء الرد"
                  onClick={() => {
                    setReplyTo(null);
                    setText("");
                  }}
                  className="grid h-11 w-11 place-items-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder={
                  userId ? (replyTo ? "اكتب ردك..." : "اكتب تعليقاً...") : "سجّل دخولك للتعليق"
                }
                onFocus={() => !userId && requireAuth()}
                className="h-11 flex-1 rounded-full bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!text.trim() || sending || pii.length > 0}
                aria-label="إرسال"
                className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-4 w-4 -scale-x-100" />
              </button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
