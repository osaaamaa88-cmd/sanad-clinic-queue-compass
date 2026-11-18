import { toast } from "sonner";
import type { RxPayload } from "@/lib/chat";

const esc = (s = "") =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const TOOTH = `<path d="M30 8c-10 0-18 7-18 19 0 9 4 15 6 25 2 11 4 32 12 32 6 0 6-16 10-24 2-4 6-4 8 0 4 8 4 24 10 24 8 0 10-21 12-32 2-10 6-16 6-25 0-12-8-19-18-19-7 0-10 4-14 4s-7-4-14-4z" fill="currentColor"/>`;
const CROSS = `<path d="M38 8h24v30h30v24H62v30H38V62H8V38h30z" fill="currentColor"/>`;

export function printRx(rx: RxPayload, size: "A5" | "thermal" = "A5") {
  const items = rx.items
    .map(
      (it, i) => `<li class="drug">
  <div class="dn"><span class="num">${i + 1}</span><span class="name" dir="ltr">${esc(it.name)}</span></div>
  <div class="sig">${esc(it.dose)}${it.notes ? `<small>${esc(it.notes)}</small>` : ""}</div>
</li>`,
    )
    .join("");
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
.num{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--gold);color:#fff;font-size: 12px;font-weight:800;flex:none}
.name{font-family:'Open Sans',Arial,sans-serif;font-weight:800;font-size:15.5px;color:#222}
.sig{direction:rtl;font-size:13px;font-weight:600;color:#7a5f33;text-align:right;max-width:55%}.sig small{display:block;font-weight:400;color:#666;font-size:12px}
.box{position:relative;margin-top:8px;padding:6px 10px;border-right:3px solid var(--gold);background:#faf7f1;font-size:12.5px}.box b{color:#7a5f33}
.f{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 22px;font-size:12px}
.f .addr b{display:block;font-size:14px;color:var(--ink)}.f .ph{direction:ltr;font-family:'Open Sans',sans-serif;font-weight:800;color:var(--gold);font-size:14px;text-align:left}
.f .ph small{display:block;font-family:Cairo;font-weight:400;color:#666;font-size: 12px}
.f .hrs{margin-top:4px}.f .hrs b{display:inline;font-size:12.5px;margin-left:4px}
.sanad{text-align:center;font-size:12px;color:#8a8a8a;padding:0 0 8px}.sanad b{color:var(--gold)}
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
<div class="sanad">صادرة عبر <b>سند | SANAD</b> — منظومتك الطبية</div>
</div></body></html>`;
  document.getElementById("sanad-rx-print")?.remove();
  const f = document.createElement("iframe");
  f.id = "sanad-rx-print";
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  f.onload = async () => {
    try {
      await Promise.race([
        f.contentDocument?.fonts?.ready,
        new Promise((r) => setTimeout(r, 1500)),
      ]);
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      try {
        f.contentWindow?.focus();
        f.contentWindow?.print();
      } catch {
        toast.error("المتصفح منع الطباعة. جرّب «تنزيل» واطبع الصورة.");
      }
    }, 200);
  };
  f.srcdoc = html;
  document.body.appendChild(f);
}
