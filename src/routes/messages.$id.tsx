import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Camera, Check, CheckCheck, FileText, ImageOff, Loader2, Phone, Pill, Printer, SendHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import { RxComposer, printRx } from "@/components/RxComposer";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, loadMessages, markRead, sendImage, sendMessage, sendRx, setAllowImages, signedImageUrl, type ChatMessage, type Conversation, type RxPayload } from "@/lib/chat";

function ChatImage({ path, onOpen }: { path: string; onOpen: (u: string) => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => { void signedImageUrl(path).then(setUrl); }, [path]);
  if (!url) return <div className="grid h-48 w-56 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return <img src={url} alt="صورة مرسلة" onClick={() => onOpen(url)} className="max-h-72 w-56 cursor-zoom-in rounded-xl object-cover" />;
}

function RxCard({ rx }: { rx: RxPayload }) {
  return (
    <div className="w-64 rounded-xl bg-background p-3 text-foreground">
      <div className="flex items-center gap-2 border-b border-border pb-2"><FileText className="h-5 w-5 text-primary" /><b>روشتة — {rx.doctor}</b></div>
      <p className="mt-1 text-xs text-muted-foreground">{rx.patient} · {rx.date}{rx.diagnosis ? ` · ${rx.diagnosis}` : ""}</p>
      <p className="mt-2 font-serif text-2xl font-bold italic text-primary">℞</p>
      <ol className="divide-y divide-dashed divide-border text-sm">{rx.items.map((it, i) => (
        <li key={i} className="py-2">
          <div className="flex items-center gap-2" dir="ltr"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span><b className="text-[15px]">{it.name}</b></div>
          <div className="mt-0.5 text-xs font-semibold text-primary">{it.dose}</div>
        </li>
      ))}</ol>
      {rx.tests && <p className="mt-2 text-xs"><b>تحاليل:</b> {rx.tests}</p>}
      {rx.advice && <p className="mt-1 text-xs"><b>تعليمات:</b> {rx.advice}</p>}
      <button type="button" onClick={() => printRx(rx)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-2 text-sm font-bold text-primary"><Printer className="h-4 w-4" /> طباعة / حفظ PDF</button>
    </div>
  );
}

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [amClinic, setAmClinic] = useState(false);
  const [clinicInfo, setClinicInfo] = useState({ doctor: "", address: "", phone: "" });
  const [uploading, setUploading] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [viewer, setViewer] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await currentUserId();
      const { data: c } = await supabase.from("clinic_conversations").select("*").eq("id", id).maybeSingle();
      if (!alive) return;
      setUid(me);
      setConv(c as Conversation | null);
      if (c) {
        const { data: clinic } = await supabase.from("clinics").select("doctor, avatar_url, phone, address, area").eq("id", c.clinic_id).maybeSingle();
        const amPatient = c.patient_id === me;
        setAmClinic(!amPatient);
        setClinicInfo({ doctor: clinic?.doctor ?? "", address: [clinic?.address, clinic?.area].filter(Boolean).join(" — "), phone: clinic?.phone ?? "" });
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clinic_conversations", filter: `id=eq.${id}` }, (p) => {
        setConv(p.new as Conversation);
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

  const allow = !!conv?.allow_images;
  const pickImage = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("اختار صورة بس"); return; }
    setUploading(true);
    const ok = await sendImage(id, f);
    setUploading(false);
    if (!ok) toast.error("تعذر إرسال الصورة"); else setMsgs(await loadMessages(id));
  };
  const toggleAllow = async () => {
    if (!conv) return;
    const ok = await setAllowImages(id, !allow);
    if (ok) { setConv({ ...conv, allow_images: !allow }); setMsgs(await loadMessages(id)); }
    else toast.error("تعذر تغيير الإذن");
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
        {amClinic && conv && (
          <button type="button" onClick={toggleAllow} aria-label="إذن الصور"
            className={`flex h-9 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${allow ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>
            {allow ? <Camera className="h-4 w-4" /> : <ImageOff className="h-4 w-4" />} {allow ? "الصور مسموحة" : "الصور مقفولة"}
          </button>
        )}
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
                      {m.kind === "image" && m.attachment_path ? (
                        <ChatImage path={m.attachment_path} onOpen={setViewer} />
                      ) : m.kind === "rx" && m.payload ? (
                        <RxCard rx={m.payload as RxPayload} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body}</p>
                      )}
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
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickImage(e.target.files?.[0]); e.target.value = ""; }} />
          {amClinic && (
            <button type="button" onClick={() => setRxOpen(true)} aria-label="كتابة روشتة" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
              <Pill className="h-5 w-5" />
            </button>
          )}
          <button type="button" aria-label="إرسال صورة" disabled={uploading}
            onClick={() => (amClinic || allow ? fileRef.current?.click() : toast("إرسال الصور متاح لما الطبيب يسمح بيه"))}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary ${amClinic || allow ? "text-primary" : "text-muted-foreground opacity-60"}`}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : amClinic || allow ? <Camera className="h-5 w-5" /> : <ImageOff className="h-5 w-5" />}
          </button>
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
      {rxOpen && (
        <RxComposer
          defaults={{ patient: conv?.patient_name ?? "", doctor: clinicInfo.doctor, specialty: "", clinicAddress: clinicInfo.address, clinicPhone: clinicInfo.phone }}
          onClose={() => setRxOpen(false)}
          onSend={async (rx) => { const ok = await sendRx(id, rx); if (ok) { toast.success("اتبعتت الروشتة للمريض"); setMsgs(await loadMessages(id)); } else toast.error("تعذر إرسال الروشتة"); return ok; }}
        />
      )}
      {viewer && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-3" onClick={() => setViewer("")}>
          <button aria-label="إغلاق" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-card/20 text-primary-foreground"><X className="h-6 w-6" /></button>
          <img src={viewer} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
