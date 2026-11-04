import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { BadgeCheck, CalendarPlus, Flag, Send, Trash2 } from "lucide-react";
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

  const sorted = useMemo(() => sortComments(items), [items]);
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
      })
      .select("id, post_id, author_id, author_name, clinic_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) return void toast.error("تعذّر إرسال التعليق");
    setItems((s) => [{ ...data, is_doctor: !!data.clinic_id, doctor_name: data.author_name }, ...s]);
    onCountChange(1);
    setText("");
  };

  const remove = async (c: CommunityComment) => {
    const { error } = await supabase.from("community_comments").delete().eq("id", c.id);
    if (error) return void toast.error("تعذّر الحذف");
    setItems((s) => s.filter((x) => x.id !== c.id));
    onCountChange(-1);
  };

  return (
    <Drawer.Root open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-surface-deep/60" />
        <Drawer.Content
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-[101] flex h-[85vh] flex-col rounded-t-[28px] border-t border-border bg-card focus:outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <Drawer.Title className="px-4 py-3 text-center text-base font-extrabold">التعليقات</Drawer.Title>
          <div className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4">
            {!loading && sorted.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">لا توجد تعليقات بعد. كن أول من يرد.</p>
            )}
            {sorted.map((c) => (
              <div
                key={c.id}
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
            ))}
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
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1000}
                placeholder={userId ? "اكتب تعليقاً..." : "سجّل دخولك للتعليق"}
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
