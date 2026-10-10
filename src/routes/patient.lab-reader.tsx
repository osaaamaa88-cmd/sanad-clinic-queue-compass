import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, FlaskConical, Loader2, Siren, HelpCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { readLab, type LabReport, type LabItem } from "@/lib/medscan.functions";
import { imageToBase64 } from "@/lib/image-to-base64";

export const Route = createFileRoute("/patient/lab-reader")({
  head: () => ({
    meta: [
      { title: "سَنَد — قارئ التحاليل الطبية" },
      { name: "description", content: "صوّر ورقة التحليل واعرف معنى كل نتيجة بشرح مصري بسيط ومطمئن." },
      { property: "og:title", content: "سَنَد — قارئ التحاليل الطبية" },
      { property: "og:description", content: "افهم نتيجة تحليلك قبل ما تروح للدكتور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabReader,
});

const STATUS: Record<LabItem["status"], { label: string; cls: string }> = {
  normal: { label: "طبيعي", cls: "bg-success/15 text-success" },
  high: { label: "مرتفع", cls: "bg-destructive/15 text-destructive" },
  low: { label: "منخفض", cls: "bg-warning/20 text-warning-foreground" },
  unknown: { label: "—", cls: "bg-muted text-muted-foreground" },
};

function LabReader() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();
  const [res, setRes] = useState<LabReport>();

  async function run(input: { image?: string; mime?: string; text?: string }) {
    setLoading(true); setErr(undefined); setRes(undefined);
    try { setRes(await readLab({ data: input })); }
    catch (e: any) { setErr(e?.message || "حصل خطأ"); }
    finally { setLoading(false); }
  }
  async function onFile(f?: File) {
    if (!f) return;
    const { data, mime, preview } = await imageToBase64(f, 2000);
    setPreview(preview);
    run({ image: data, mime });
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4 p-4 pb-28">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><FlaskConical className="h-6 w-6" /></span>
          <div><h1 className="text-xl font-extrabold">قارئ التحاليل</h1><p className="text-xs text-muted-foreground">افهم نتيجتك بهدوء قبل زيارة الدكتور</p></div>
        </header>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={loading} className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-primary-soft/30 p-6 font-bold text-primary transition active:scale-95">
          {preview ? <img src={preview} alt="ورقة التحليل" className="max-h-56 rounded-xl" /> : <Camera className="h-10 w-10" />}
          {preview ? "صوّر تحليل تاني" : "صوّر ورقة التحليل"}
        </button>

        <details className="rounded-2xl border border-border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-bold">أو اكتب القيم يدوياً</summary>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="مثلاً: Hb 10.5, WBC 7.2, HbA1c 6.8" className="mt-2 w-full rounded-xl border border-input bg-background p-3" />
          <button onClick={() => { if (text.trim()) { setPreview(undefined); run({ text }); } }} disabled={loading} className="mt-2 w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground">اشرح النتيجة</button>
        </details>

        {loading && <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> بنقرأ التحليل...</div>}
        {err && <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{err}</div>}
        {res && !res.found && <div className="rounded-2xl bg-muted p-4 text-sm">مالقيناش تحليل في الصورة. صوّر الورقة كاملة وفي إضاءة كويسة.</div>}

        {res?.found && (
          <div className="space-y-3">
            {res.urgent && (
              <Link to="/patient/emergency" className="flex items-center gap-3 rounded-2xl bg-destructive p-4 text-destructive-foreground">
                <Siren className="h-6 w-6" /><span className="text-sm font-bold">فيه قيمة محتاجة اهتمام عاجل — كلّم دكتورك أو اتصل ١٢٣</span>
              </Link>
            )}
            <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
              <p className="text-xs font-bold text-primary">{res.type}</p>
              <p className="mt-1 text-sm leading-7">{res.summary}</p>
            </section>
            <ul className="space-y-2">{res.items.map((it, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm" dir="ltr">{it.name}</b>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[it.status].cls}`}>{STATUS[it.status].label}</span>
                </div>
                <p className="text-sm" dir="ltr"><b>{it.value}</b> {it.unit} {it.range && <span className="text-xs text-muted-foreground">({it.range})</span>}</p>
                {it.explain && <p className="mt-1 text-xs leading-5 text-muted-foreground">{it.explain}</p>}
              </li>
            ))}</ul>
            {res.questions.length > 0 && (
              <section className="rounded-3xl bg-primary-soft/40 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-extrabold"><HelpCircle className="h-4 w-4 text-primary" />اسأل دكتورك</h3>
                <ul className="list-disc space-y-1 ps-5 text-sm">{res.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </section>
            )}
          </div>
        )}
        <p className="text-center text-[11px] leading-5 text-muted-foreground">الشرح استرشادي بالذكاء الاصطناعي ولا يغني عن الكشف الطبي — اعرض النتيجة على طبيبك دايماً.</p>
      </div>
    </AppShell>
  );
}
