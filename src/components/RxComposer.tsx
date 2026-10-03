import { useState } from "react";
import { Bluetooth, Download, Loader2, Plus, Printer, Send, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { downloadRx, printRxBluetooth } from "@/lib/rx-output";
import { DOSE_PRESETS, addFavorite, doseForForm, getFavorites, searchDrugs } from "@/lib/egypt-drugs";
import type { RxItem, RxPayload } from "@/lib/chat";

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function printRx(rx: RxPayload, size: "A5" | "thermal" = "A5") {
  const items = rx.items.map((it, i) => `<li><b>${i + 1}. ${esc(it.name)}</b><div class="dose">${esc(it.dose)}</div>${it.notes ? `<div class="dose">${esc(it.notes)}</div>` : ""}</li>`).join("");
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(location.origin)}`;
  const page = size === "A5" ? "@page{size:A5;margin:10mm}" : "@page{size:80mm auto;margin:3mm}body{width:74mm;font-size:12px}.f{position:static!important;margin-top:10px}";
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>روشتة ${esc(rx.patient)}</title>
<style>body{font-family:Tahoma,Arial,sans-serif;color:#111;margin:0}
.h{display:flex;justify-content:space-between;border-bottom:3px solid #0e7490;padding-bottom:8px}
.h h1{margin:0;font-size:20px;color:#0e7490}.h p{margin:2px 0;font-size:12px}
.pt{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;margin:10px 0;padding:6px;background:#f1f5f9;border-radius:6px}
.rx{font-size:34px;color:#0e7490;font-family:serif;margin:4px 0}ul{list-style:none;padding:0;margin:0}li{margin:0 0 10px;font-size:15px}
.dose{font-size:13px;color:#334155;margin-right:18px}.sec{font-size:13px;margin-top:10px}
.f{position:fixed;bottom:0;left:0;right:0;border-top:2px solid #0e7490;padding-top:6px;font-size:11px;display:flex;justify-content:space-between;align-items:center}
${page}</style></head><body>
<div class="h"><div><h1>${esc(rx.doctor)}</h1><p>${esc(rx.specialty || "")}</p></div><div style="text-align:left"><p><b>سَنَد | SANAD</b></p><p>${esc(rx.date)}</p></div></div>
<div class="pt"><span>المريض: <b>${esc(rx.patient)}</b></span>${rx.age ? `<span>السن: ${esc(rx.age)}</span>` : ""}${rx.diagnosis ? `<span>التشخيص: ${esc(rx.diagnosis)}</span>` : ""}</div>
<div class="rx">℞</div><ul>${items}</ul>
${rx.tests ? `<div class="sec"><b>تحاليل / أشعة:</b> ${esc(rx.tests)}</div>` : ""}
${rx.advice ? `<div class="sec"><b>تعليمات:</b> ${esc(rx.advice)}</div>` : ""}
<div class="f"><div>${esc(rx.clinicAddress || "")}<br>${rx.clinicPhone ? "📞 " + esc(rx.clinicPhone) : ""}</div><img src="${qr}" width="60" height="60"></div>
</body></html>`;
  document.getElementById("sanad-rx-print")?.remove();
  const f = document.createElement("iframe");
  f.id = "sanad-rx-print";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  f.onload = () => setTimeout(() => {
    try { f.contentWindow?.focus(); f.contentWindow?.print(); }
    catch { toast.error("المتصفح منع الطباعة. جرّب «تنزيل» واطبع الصورة."); }
  }, 500);
  f.srcdoc = html;
  document.body.appendChild(f);
}

export function RxComposer({ defaults, onClose, onSend }: {
  defaults: Pick<RxPayload, "patient" | "doctor" | "specialty" | "clinicAddress" | "clinicPhone">;
  onClose: () => void;
  onSend?: (rx: RxPayload) => Promise<boolean>;
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
  const [btBusy, setBtBusy] = useState(false);
  const [favs, setFavs] = useState<string[]>(() => getFavorites());
  const results = searchDrugs(q);

  const add = (name: string, form?: string) => {
    const n = name.trim();
    if (!n) return;
    const d = (form && dose === DOSE_PRESETS[0] && doseForForm(form)) || dose;
    setItems((p) => [...p, { name: n, dose: d }]);
    addFavorite(n); setFavs(getFavorites()); setQ("");
  };
  const build = (): RxPayload => ({ ...defaults, patient, age, diagnosis, items, advice, tests, date: new Date().toLocaleDateString("ar-EG") });
  const valid = patient.trim() && items.length > 0;
  const need = () => { if (!patient.trim()) { toast.error("اكتب اسم المريض الأول"); return false; } if (!items.length) { toast.error("ضيف دواء واحد على الأقل"); return false; } return true; };
  const btn = "flex flex-col items-center justify-center gap-1 rounded-xl border border-primary py-2.5 text-xs font-bold text-primary disabled:opacity-50";

  const input = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
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
          <input dir="ltr" className={input} placeholder="ابحث بالاسم أو المادة… (Aug, بانادول)" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(q); } }} />
          {(results.length > 0 || q.trim().length >= 2) && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
              {results.map((d) => (
                <button key={d.n} type="button" onClick={() => add(d.n, d.f)} className="block w-full px-3 py-2 text-start hover:bg-secondary" dir="ltr">
                  <span className="font-bold">{d.n}</span>{d.ar && <span className="ms-1 text-xs text-primary" dir="rtl">({d.ar})</span>} <span className="text-xs text-muted-foreground">— {d.a} · {d.f}</span>
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

        {!valid && <p className="mt-4 text-center text-xs text-muted-foreground">اكتب اسم المريض وضيف دواء واحد على الأقل علشان تطبع أو تنزّل</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => need() && printRx(build(), "A5")} className={btn}>
            <Printer className="h-4 w-4" /> طباعة A5
          </button>
          <button type="button" onClick={() => need() && printRx(build(), "thermal")} className={btn}>
            <Printer className="h-4 w-4" /> طابعة حرارية (إيصال)
          </button>
          <button type="button" disabled={btBusy} onClick={async () => {
            if (!need()) return;
            setBtBusy(true);
            try { await printRxBluetooth(build()); toast.success("تمت الطباعة بالبلوتوث"); }
            catch (e) { const m = (e as Error).message; if (!/cancel/i.test(m)) toast.error(m || "تعذر الاتصال بالطابعة"); }
            finally { setBtBusy(false); }
          }} className={btn}>
            {btBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />} طابعة بلوتوث مباشرة
          </button>
          <button type="button" onClick={async () => { if (!need()) return; try { const r = await downloadRx(build()); toast.success(r === "shared" ? "تمت المشاركة" : "اتنزلت الروشتة"); } catch { toast.error("تعذر التنزيل"); } }} className={btn}>
            <Download className="h-4 w-4" /> تنزيل / مشاركة
          </button>
        </div>
        {onSend && (
          <button type="button" disabled={!valid || busy} onClick={async () => { setBusy(true); const ok = await onSend(build()); setBusy(false); if (ok) onClose(); }}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال للمريض
          </button>
        )}
      </div>
    </div>
  );
}
