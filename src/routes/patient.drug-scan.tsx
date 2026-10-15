import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Loader2, Pill, Plus, Search, AlertTriangle, Repeat } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAiConsent, aiErrorMessage } from "@/components/AiConsentDialog";
import { scanDrug, type DrugScan } from "@/lib/medscan.functions";
import { imageToBase64 } from "@/lib/image-to-base64";

export const Route = createFileRoute("/patient/drug-scan")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — ماسح الأدوية وبدائل النواقص" },
      { name: "description", content: "صوّر علبة الدواء واعرف مادته الفعالة وجرعته ومثائله المصرية لو ناقص." },
      { property: "og:title", content: "سَنَد — ماسح الأدوية وبدائل النواقص" },
      { property: "og:description", content: "اعرف بدائل الدواء الناقص في مصر بصورة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DrugScanPage,
});

function addToMeds(r: DrugScan) {
  const KEY = "sanad_meds_v1";
  const list = JSON.parse(localStorage.getItem(KEY) || "[]");
  list.push({ id: crypto.randomUUID(), name: `${r.name} ${r.strength}`.trim(), dose: r.usualDose.slice(0, 60), times: ["08:00"], notes: r.active, createdAt: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(list));
}

function DrugScanPage() {
  const toolsBack = useDoctorClinicId() ? "/doctor" : "/patient/login";
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();
  const consent = useAiConsent();
  const [res, setRes] = useState<DrugScan>();
  const [added, setAdded] = useState(false);

  async function run(input: { image?: string; mime?: string; text?: string }) {
    if (!(await consent.ask())) return;
    setLoading(true); setErr(undefined); setRes(undefined); setAdded(false);
    try { setRes(await scanDrug({ data: input })); }
    catch (e: any) { setErr(aiErrorMessage(e)); }
    finally { setLoading(false); }
  }
  async function onFile(f?: File) {
    if (!f) return;
    const { data, mime, preview } = await imageToBase64(f);
    setPreview(preview);
    run({ image: data, mime });
  }

  return (
    <AppShell title="ماسح الأدوية" backTo={toolsBack}>
      {consent.dialog}
      <div className="mx-auto max-w-xl space-y-4 p-4 pb-28">
        <header className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-warning text-warning-foreground"><Pill className="h-6 w-6" /></span>
          <div><h1 className="text-xl font-extrabold">ماسح الأدوية</h1><p className="text-xs text-muted-foreground">صوّر العلبة واعرف البديل لو الدواء ناقص</p></div>
        </header>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={loading} className="flex w-full flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-primary/40 bg-primary-soft/30 p-6 font-bold text-primary transition active:scale-95">
          {preview ? <img src={preview} alt="صورة الدواء" className="max-h-48 rounded-xl" /> : <Camera className="h-10 w-10" />}
          {preview ? "صوّر دواء تاني" : "صوّر علبة الدواء أو الروشتة"}
        </button>

        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) { setPreview(undefined); run({ text }); } }} className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أو اكتب اسم الدواء (مثلاً: كونكور 5)" className="flex-1 rounded-2xl border border-input bg-card px-4 py-3 text-sm" />
          <button disabled={loading} className="grid w-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><Search className="h-5 w-5" /></button>
        </form>

        {loading && <div className="flex items-center justify-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> بنقرأ الدواء...</div>}
        {err && <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">{err}</div>}

        {res && !res.found && <div className="rounded-2xl bg-muted p-4 text-sm">ماقدرناش نتعرف على دواء. جرّب صورة أوضح للاسم المكتوب على العلبة.</div>}
        {res?.found && (
          <div className="space-y-3">
            <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
              <h2 className="text-lg font-extrabold">{res.name} <span className="text-primary">{res.strength}</span></h2>
              <p className="text-xs text-muted-foreground">{res.form} • المادة الفعالة: <b className="text-foreground">{res.active}</b></p>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="font-bold">بيستخدم لـ</dt><dd className="text-muted-foreground">{res.uses}</dd></div>
                <div><dt className="font-bold">الجرعة المعتادة</dt><dd className="text-muted-foreground">{res.usualDose}</dd></div>
              </dl>
              {res.warnings && <p className="mt-3 flex gap-2 rounded-xl bg-warning/15 p-3 text-xs"><AlertTriangle className="h-4 w-4 shrink-0 text-warning" />{res.warnings}</p>}
              <button onClick={() => { addToMeds(res); setAdded(true); }} disabled={added} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                <Plus className="h-4 w-4" />{added ? "اتضاف لمواعيد الأدوية ✓" : "أضف لمنبه مواعيد الأدوية"}
              </button>
              {added && <Link to="/patient/meds" className="mt-2 block text-center text-xs font-bold text-primary">اضبط المواعيد ←</Link>}
            </section>

            {res.equivalents.length > 0 && (
              <section className="rounded-3xl border border-success/30 bg-success/10 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-extrabold"><Repeat className="h-4 w-4 text-success" />مثائل مصرية (نفس المادة والتركيز)</h3>
                <ul className="space-y-2">{res.equivalents.map((a, i) => (
                  <li key={i} className="rounded-xl bg-card p-3 text-sm"><b>{a.name}</b> <span className="text-xs text-muted-foreground">— {a.company}</span>{a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}</li>
                ))}</ul>
              </section>
            )}
            {res.similar.length > 0 && (
              <section className="rounded-3xl border border-border bg-card p-4">
                <h3 className="mb-2 font-extrabold">بدائل من نفس العائلة <span className="text-xs font-normal text-destructive">(بموافقة الطبيب فقط)</span></h3>
                <ul className="space-y-2">{res.similar.map((a, i) => (
                  <li key={i} className="rounded-xl bg-muted p-3 text-sm"><b>{a.name}</b> <span className="text-xs text-muted-foreground">— {a.company}</span>{a.note && <p className="text-xs text-muted-foreground">{a.note}</p>}</li>
                ))}</ul>
              </section>
            )}
          </div>
        )}
        <p className="text-center text-[11px] leading-5 text-muted-foreground">المعلومات استرشادية بالذكاء الاصطناعي — راجع الصيدلي أو الطبيب قبل تغيير أي دواء.</p>
      </div>
    </AppShell>
  );
}
