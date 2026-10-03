import { useState } from "react";
import { Bluetooth, Download, Loader2, Plus, Printer, Send, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { downloadRx, printRxBluetooth } from "@/lib/rx-output";
import { DOSE_PRESETS, addFavorite, doseForForm, getFavorites, searchDrugs } from "@/lib/egypt-drugs";
import type { RxItem, RxPayload } from "@/lib/chat";

const esc = (s = "") => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const TOOTH = `<path d="M30 8c-10 0-18 7-18 19 0 9 4 15 6 25 2 11 4 32 12 32 6 0 6-16 10-24 2-4 6-4 8 0 4 8 4 24 10 24 8 0 10-21 12-32 2-10 6-16 6-25 0-12-8-19-18-19-7 0-10 4-14 4s-7-4-14-4z" fill="currentColor"/>`;
const CROSS = `<path d="M38 8h24v30h30v24H62v30H38V62H8V38h30z" fill="currentColor"/>`;

export function printRx(rx: RxPayload, size: "A5" | "thermal" = "A5") {
  const items = rx.items.map((it, i) => `<li class="drug">
  <div class="dn"><span class="num">${i + 1}</span><span class="name" dir="ltr">${esc(it.name)}</span></div>
  <div class="sig">${esc(it.dose)}${it.notes ? `<small>${esc(it.notes)}</small>` : ""}</div>
</li>`).join("");
  const thermal = size === "thermal";
  const dental = /أسنان|اسنان|dental|dent/i.test(`${rx.specialty} ${rx.doctor}`);
  const icon = dental ? TOOTH : CROSS;
  const en = dental ? "DENTAL<span>CLINIC</span>" : "MEDICAL<span>CLINIC</span>";
  const doc = rx.doctor.trim().startsWith("د") ? rx.doctor : `د/ ${rx.doctor}`;
  const page = thermal
    ? "@page{size:80mm auto;margin:3mm}body{width:74mm}.sheet{min-height:0}.wm{display:none}.h{flex-direction:column-reverse;align-items:center;text-align:center}.drug{flex-direction:column;align-items:stretch;gap:2px}.sig{text-align:right;max-width:none}.f{flex-direction:column;gap:6px;text-align:center}"
    : "@page{size:A5;margin:0}.sheet{min-height:210mm}";
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>روشتة ${esc(rx.patient)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Great+Vibes&family=Open+Sans:wght@400;700;800&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--gold:#b08d57;--gold2:#c9a96e;--ink:#3a3a3a}
body{font-family:Cairo,Tahoma,sans-serif;color:var(--ink);margin:0;font-size:13px;background:#fff}
.sheet{position:relative;display:flex;flex-direction:column;overflow:hidden}
.h{display:flex;justify-content:space-between;align-items:center;padding:14px 22px 10px}
.h h1{margin:0;font-size:22px;font-weight:600;color:var(--ink)}.h .sp{margin:2px 0 0;font-size:15px;color:#555}
.logo{text-align:center;color:var(--gold);font-family:'Open Sans',sans-serif}.logo svg{width:44px;height:44px}
.logo .t{font-size:12px;font-weight:800;letter-spacing:.5px;color:#222}.logo .t span{font-weight:400;margin-left:3px}
.bar{height:5px;background:linear-gradient(90deg,var(--gold),var(--gold2),var(--gold))}
.body{position:relative;flex:1;padding:12px 26px}
.wm{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;color:#d8d2c6;opacity:.35}.wm svg{width:55%;max-width:260px}
.pt{position:relative;direction:ltr;font-family:'Open Sans',sans-serif;font-size:12.5px;line-height:2}
.pt div{display:flex;gap:8px;align-items:baseline}.pt label{color:var(--gold);font-weight:700;min-width:72px}.pt label:before{content:"• "}
.pt b{flex:1;max-width:260px;border-bottom:1.5px dotted #999;font-weight:600;color:#222;font-family:Cairo,'Open Sans',sans-serif;text-align:left}
.rx{position:relative;direction:ltr;font-family:'Great Vibes',cursive;font-size:46px;color:var(--gold);line-height:1;margin:8px 0 4px}
ul{position:relative;list-style:none;padding:0;margin:0}
.drug{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 2px;border-bottom:1px dashed #cbbd9f;page-break-inside:avoid;direction:ltr}
.drug:last-child{border-bottom:0}
.dn{display:flex;align-items:center;gap:8px}
.num{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--gold);color:#fff;font-size:11px;font-weight:800;flex:none}
.name{font-family:'Open Sans',Arial,sans-serif;font-weight:800;font-size:15.5px;color:#222}
.sig{direction:rtl;font-size:13px;font-weight:600;color:#7a5f33;text-align:right;max-width:55%}.sig small{display:block;font-weight:400;color:#666;font-size:11.5px}
.box{position:relative;margin-top:8px;padding:6px 10px;border-right:3px solid var(--gold);background:#faf7f1;font-size:12.5px}.box b{color:#7a5f33}
.f{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 22px;font-size:12px}
.f .addr b{display:block;font-size:14px;color:var(--ink)}.f .ph{direction:ltr;font-family:'Open Sans',sans-serif;font-weight:800;color:var(--gold);font-size:14px;text-align:left}
.f .ph small{display:block;font-family:Cairo;font-weight:400;color:#666;font-size:11px}
.f .hrs{margin-top:4px}.f .hrs b{display:inline;font-size:12.5px;margin-left:4px}
.sanad{text-align:center;font-size:10.5px;color:#8a8a8a;padding:0 0 8px}.sanad b{color:var(--gold)}
${page}</style></head><body><div class="sheet">
<div class="h"><div><h1>${esc(doc)}</h1>${rx.specialty ? `<p class="sp">${esc(rx.specialty)}</p>` : ""}</div>
<div class="logo"><svg viewBox="0 0 100 100">${icon}</svg><div class="t">${en}</div></div></div>
<div class="bar"></div>
<div class="body"><div class="wm"><svg viewBox="0 0 100 100">${icon}</svg></div>
<div class="pt"><div><label>Name</label><b>${esc(rx.patient)}</b></div><div><label>Date</label><b>${esc(rx.date)}</b></div>${rx.age ? `<div><label>Age</label><b>${esc(rx.age)}</b></div>` : ""}${rx.diagnosis ? `<div><label>Diagnosis</label><b>${esc(rx.diagnosis)}</b></div>` : ""}</div>
<div class="rx">R /</div><ul>${items}</ul>
${rx.tests ? `<div class="box"><b>تحاليل / أشعة:</b> ${esc(rx.tests)}</div>` : ""}
${rx.advice ? `<div class="box"><b>تعليمات:</b> ${esc(rx.advice)}</div>` : ""}
</div>
<div class="bar"></div>
<div class="f"><div class="addr"><b>العنوان :</b>${esc(rx.clinicAddress || "—")}${rx.clinicHours ? `<div class="hrs"><b>مواعيد العمل :</b>${esc(rx.clinicHours)}</div>` : ""}</div>
${rx.clinicPhone ? `<div class="ph">${esc(rx.clinicPhone)}<small>للحجز والاستعلام / واتساب</small></div>` : ""}</div>
<div class="sanad">صادرة عبر <b>سَنَد | SANAD</b> — منظومتك الطبية</div>
</div></body></html>`;
  document.getElementById("sanad-rx-print")?.remove();
  const f = document.createElement("iframe");
  f.id = "sanad-rx-print";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  f.onload = async () => {
    try { await Promise.race([f.contentDocument?.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* ignore */ }
    setTimeout(() => {
      try { f.contentWindow?.focus(); f.contentWindow?.print(); }
      catch { toast.error("المتصفح منع الطباعة. جرّب «تنزيل» واطبع الصورة."); }
    }, 200);
  };
  f.srcdoc = html;
  document.body.appendChild(f);
}

export function RxComposer({ defaults, onClose, onSend }: {
  defaults: Pick<RxPayload, "patient" | "doctor" | "specialty" | "clinicAddress" | "clinicPhone"> & { clinicHours?: string };
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
  const [specialty, setSpecialty] = useState(defaults.specialty ?? "");
  const [hours, setHours] = useState(() => (typeof window !== "undefined" && localStorage.getItem("sanad-rx-hours")) || defaults.clinicHours || "");
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
  const build = (): RxPayload => { try { localStorage.setItem("sanad-rx-hours", hours); } catch { /* ignore */ } return { ...defaults, specialty: specialty || defaults.specialty, clinicHours: hours, patient, age, diagnosis, items, advice, tests, date: new Date().toLocaleDateString("ar-EG") }; };
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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className={input} placeholder="تخصص الطبيب (اختياري)" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          <input className={input} placeholder="أيام ومواعيد العمل (اختياري)" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>

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
