import { useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, Loader2 } from "lucide-react";
import { ownerAiChat } from "@/lib/owner-ai.functions";

type Msg = { role: "user" | "assistant"; text: string };

const QUICK = [
  "ملخص نشاط النهارده",
  "إحصائيات الحجوزات",
  "فيه أخطاء أو مشاكل في النظام؟",
  "العيادات اللي مستنية توثيق",
];

export function OwnerAiTab() {
  const chat = useServerFn(ownerAiChat);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, text: t }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const r = await chat({ data: { messages: next } });
      setMsgs([...next, { role: "assistant", text: r.text }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", text: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col rounded-2xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">مساعد المالك</p>
          <p className="text-[11px] text-muted-foreground">بيشوف بيانات التطبيق لحظياً ويجاوبك</p>
        </div>
      </div>
      <div className="min-h-[300px] max-h-[55vh] space-y-3 overflow-y-auto py-3">
        {msgs.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-xl bg-secondary p-3 text-start text-xs font-semibold text-foreground active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-start" : "flex justify-end"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-end text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اسأل عن أي حاجة في التطبيق…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
