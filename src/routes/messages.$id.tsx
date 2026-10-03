import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCheck, Loader2, Phone, SendHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, loadMessages, markRead, sendMessage, type ChatMessage, type Conversation } from "@/lib/chat";

export const Route = createFileRoute("/messages/$id")({
  head: () => ({
    meta: [
      { title: "محادثة — سَنَد" },
      { name: "description", content: "محادثة مباشرة بين المريض والعيادة على سَنَد." },
      { property: "og:title", content: "محادثة — سَنَد" },
      { property: "og:description", content: "تواصل مع عيادتك داخل سَنَد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatScreen,
});

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
const dayOf = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "النهارده";
  if (d.toDateString() === y.toDateString()) return "امبارح";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
};

function ChatScreen() {
  const { id } = Route.useParams();
  const [uid, setUid] = useState<string | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [peer, setPeer] = useState<{ name: string; avatar: string; phone: string }>({ name: "", avatar: "", phone: "" });
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await currentUserId();
      const { data: c } = await supabase.from("clinic_conversations").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      setUid(me);
      setConv(c as Conversation | null);
      if (c) {
        const { data: clinic } = await supabase.from("clinics").select("doctor, avatar_url, phone").eq("id", c.clinic_id).maybeSingle();
        const amPatient = c.patient_id === me;
        setPeer(amPatient
          ? { name: clinic?.doctor ?? "العيادة", avatar: clinic?.avatar_url ?? "", phone: clinic?.phone ?? "" }
          : { name: c.patient_name || "مريض", avatar: "", phone: "" });
        setMsgs(await loadMessages(id));
        if (me) void markRead(id, me);
      }
      if (alive) setLoading(false);
    })();
    const ch = supabase
      .channel(`chat-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "clinic_messages", filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as ChatMessage;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        void currentUserId().then((me) => { if (me && m.sender_id !== me) void markRead(id, me); });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clinic_messages", filter: `conversation_id=eq.${id}` }, (p) => {
        const m = p.new as ChatMessage;
        setMsgs((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const body = text;
    setText("");
    const ok = await sendMessage(id, body);
    if (!ok) setText(body);
    else setMsgs(await loadMessages(id));
    setSending(false);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex items-center gap-3 bg-card px-3 py-2.5 shadow-sm">
        <Link to="/messages" aria-label="رجوع" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary">
          <ArrowRight className="h-5 w-5" />
        </Link>
        {peer.avatar ? (
          <img src={peer.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft font-extrabold text-primary">{(peer.name || "؟").slice(0, 1)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{peer.name || "…"}</p>
          <p className="text-[11px] text-muted-foreground">بترد عادةً خلال ساعات العمل</p>
        </div>
        {peer.phone && (
          <a href={`tel:${peer.phone}`} aria-label="اتصال" className="grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-secondary">
            <Phone className="h-5 w-5" />
          </a>
        )}
      </header>

      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.08) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {loading ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !conv ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">المحادثة مش موجودة أو مش متاحة ليك.</p>
        ) : (
          <>
            <div className="mx-auto mb-4 max-w-xs rounded-lg bg-warning/15 px-3 py-2 text-center text-[11px] text-foreground">
              🔒 الرسائل خاصة بينك وبين العيادة. للحالات الطارئة اتصل بالإسعاف 123.
            </div>
            {msgs.map((m, i) => {
              const mine = m.sender_id === uid;
              const newDay = i === 0 || dayOf(msgs[i - 1].created_at) !== dayOf(m.created_at);
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-card px-3 py-1 text-[11px] font-bold text-muted-foreground shadow-sm">{dayOf(m.created_at)}</span>
                    </div>
                  )}
                  <div className={`mb-1.5 flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-3 pb-1.5 pt-2 shadow-sm ${
                        mine ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-card text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body}</p>
                      <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {timeOf(m.created_at)}
                        {mine && (m.read_at ? <CheckCheck className="h-3.5 w-3.5 text-success" /> : <Check className="h-3.5 w-3.5" />)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      {conv && (
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="flex items-end gap-2 bg-background px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            rows={1}
            maxLength={2000}
            placeholder="اكتب رسالة"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-border bg-card px-4 py-2.5 text-[15px] outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="إرسال"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <SendHorizontal className="h-5 w-5 rotate-180" />}
          </button>
        </form>
      )}
    </div>
  );
}
