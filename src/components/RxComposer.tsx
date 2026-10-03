import { useState } from "react";
import { Loader2, Plus, Printer, Send, Star, Trash2, X } from "lucide-react";
import { DOSE_PRESETS, addFavorite, getFavorites, searchDrugs } from "@/lib/egypt-drugs";
import type { RxItem, RxPayload } from "@/lib/chat";

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function printRx(rx: RxPayload) {
  const w = window.open("", "_blank", "width=600,height=800");
  if (!w) return;
  const items = rx.items.map((it, i) => `<li><b>${i + 1}. ${esc(it.name)}</b><div class="dose">${esc(it.dose)}</div>${it.notes ? `<div class="dose">${esc(it.notes)}</div>` : ""}</li>`).join("");
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(location.origin)}`;
  w.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>روشتة ${esc(rx.patient)}</title>
<style>@page{size:A5;margin:10mm}body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0}
.h{display:flex;justify-content:space-between;border-bottom:3px solid #0e7490;padding-bottom:8px}
.h h1{margin:0;font-size:20px;color:#0e7490}.h p{margin:2px 0;font-size:12px}
.pt{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;margin:10px 0;padding:6px;background:#f1f5f9;border-radius:6px}
.rx{font-size:34px;color:#0e7490;font-family:serif;margin:4px 0}ul{list-style:none;padding:0;margin:0}li{margin:0 0 10px;font-size:15px}
.dose{font-size:13px;color:#334155;margin-right:18px}.sec{font-size:13px;margin-top:10px}
.f{position:fixed;bottom:0;left:0;right:0;border-top:2px solid #0e7490;padding-top:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center}
</style></head><body>
<div class="h"><div><h1>${esc(rx.doctor)}</h1><p>${esc(rx.specialty || "")}</p></div><div style="text-align:left"><p><b>سَنَد | SANAD</b></p><p>${esc(rx.date)}</p></div></div>
<div class="pt"><span>المريض: <b>${esc(rx.patient)}</b></span>${rx.age ? `<span>السن: ${esc(rx.age)}</span>` : ""}${rx.diagnosis ? `<span>التشخيص: ${esc(rx.diagnosis)}</span>` : ""}</div>
<div class="rx">℞</div><ul>${items}</ul>
${rx.tests ? `<div class="sec"><b>تحاليل / أشعة:</b> ${esc(rx.tests)}</div>` : ""}
${rx.advice ? `<div class="sec"><b>تعليمات:</b> ${esc(rx.advice)}</div>` : ""}
<div class="f"><div>${esc(rx.clinicAddress || "")}<br>${rx.clinicPhone ? "📞 " + esc(rx.clinicPhone) : ""}</div><img src="${qr}" width="60" height="60"></div>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
  w.document.close();
}

export function RxComposer({ defaults, onClose, onSend }: {
  defaults: Pick<RxPayload, "patient" | "doctor" | "specialty" | "clinicAddress" | "clinicPhone">;
  onClose: () => void;
  onSend: (rx: RxPayload) => Promise<boolean>;
}) {
  const [patient, setPatient] = useState(defaults.patient);
  const [age, setAge] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<RxItem[]>([]);
  const [q, setQ] = useState("");
  const [dose, setDose] = useState(DOSE_PRESETS[0]);
  const [advice, setAdvice] = useState("");
  const [tests, setTests] = useState("");
  const [busy, setBusy] = useState(false);
  const [favs, setFavs] = useState<string[]>(() => getFavorites());
  const results = searchDrugs(q);

  const add = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setItems((p) => [...p, { name: n, dose }]);
    addFavorite(n); setFavs(getFavorites()); setQ("");
  };
  const build = (): RxPayload => ({ ...defaults, patient, age, diagnosis, items, advice, tests, date: new Date().toLocaleDateString("ar-EG") });
  const valid = patient.trim() && items.length > 0;

  const input = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">💊 روشتة جديدة</h2>
          <button onClick={onClose} aria-label="إغلاق" className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className={`${input} col-span-2`} placeholder="اسم المريض" value={patient} onChange={(e) => setPatient(e.target.value)} />
          <input className={input} placeholder="السن" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <input className={`${input} mt-2`} placeholder="التشخيص" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />

        <p className="mt-4 mb-1 text-xs font-bold text-muted-foreground">الجرعة للدواء القادم</p>
        <select className={input} value={dose} onChange={(e) => setDose(e.target.value)}>
          {DOSE_PRESETS.map((d) => <option key={d}>{d}</option>)}
        </select>

        <div className="relative mt-2">
          <input dir="ltr" className={input} placeholder="ابحث عن دواء… (Aug, Panadol)" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(q); } }} />
          {(results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {results.map((d) => (
                <button key={d.n} type="button" onClick={() => add(d.n)} className="block w-full px-3 py-2 text-start hover:bg-secondary" dir="ltr">
                  <span className="font-bold">{d.n}</span> <span className="text-xs text-muted-foreground">— {d.a} · {d.f}</span>
                </button>
              ))}
              <button type="button" onClick={() => add(q)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-secondary">
                <Plus className="h-4 w-4" /> إضافة «{q}» كدواء حر
              </button>
            </div>
          )}
        </div>
        {favs.length > 0 && !q && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {favs.slice(0, 10).map((f) => (
              <button key={f} type="button" onClick={() => add(f)} dir="ltr" className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                <Star className="h-3 w-3 text-warning" /> {f}
              </button>
            ))}
          </div>
        )}

        <ol className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-xl border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <b dir="ltr">{i + 1}. {it.name}</b>
                <button type="button" aria-label="حذف" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <input className={`${input} mt-1`} value={it.dose} onChange={(e) => setItems((p) => p.map((x, j) => (j === i ? { ...x, dose: e.target.value } : x)))} />
            </li>
          ))}
        </ol>

        <textarea className={`${input} mt-3`} rows={2} placeholder="تحاليل أو أشعة مطلوبة" value={tests} onChange={(e) => setTests(e.target.value)} />
        <textarea className={`${input} mt-2`} rows={2} placeholder="تعليمات (أكل، راحة، ميعاد المتابعة…)" value={advice} onChange={(e) => setAdvice(e.target.value)} />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={!valid} onClick={() => printRx(build())} className="flex items-center justify-center gap-2 rounded-xl border border-primary py-3 font-bold text-primary disabled:opacity-50">
            <Printer className="h-4 w-4" /> طباعة A5
          </button>
          <button type="button" disabled={!valid || busy} onClick={async () => { setBusy(true); const ok = await onSend(build()); setBusy(false); if (ok) onClose(); }}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال للمريض
          </button>
        </div>
      </div>
    </div>
  );
}
