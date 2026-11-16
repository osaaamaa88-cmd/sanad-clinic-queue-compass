import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, RotateCw, Share2, Download } from "lucide-react";
import { loadVault } from "@/lib/offline-db";
import { getPatientSession } from "@/lib/patient-session";
import { encodeHealthPass } from "@/lib/health-pass";
import { makePatientCode, PATIENT_CODE_RE } from "@/lib/clinic-queue";

const CODE_KEY = "sanad.patientCode";

function readCode() {
  const c = localStorage.getItem(CODE_KEY);
  if (c && PATIENT_CODE_RE.test(c)) return c;
  const n = makePatientCode();
  localStorage.setItem(CODE_KEY, n);
  return n;
}

/** كارت سند: كارت بوجهين، الخلفي فيه QR يتولد على الجهاز ويعمل بدون إنترنت. */
export function SanadHealthPassCard() {
  const [qr, setQr] = useState("");
  const [flipped, setFlipped] = useState(false);
  const [info, setInfo] = useState({ name: "", phone: "", blood: "", allergies: "", code: "", contact: "" });

  async function build() {
    const s = getPatientSession();
    const v = await loadVault();
    const code = readCode();
    const name = s?.name ?? "مريض سند";
    setInfo({
      name, code,
      phone: s?.phone ?? "",
      blood: v?.bloodType ?? "",
      allergies: v?.allergies ?? "",
      contact: [v?.contactName, v?.contactPhone].filter(Boolean).join(" — "),
    });
    const text = encodeHealthPass({
      name, phone: s?.phone ? `${s.phone}` : undefined, bloodType: v?.bloodType, allergies: v?.allergies,
      chronic: v?.chronic, contactName: v?.contactName, contactPhone: v?.contactPhone, issuedAt: Date.now(),
    });
    const QR = (await import("qrcode")).default;
    setQr(await QR.toDataURL(text, { margin: 1, width: 420, errorCorrectionLevel: "M" }));
  }

  useEffect(() => { void build(); }, []);

  async function share() {
    if (!qr) return;
    const blob = await (await fetch(qr)).blob();
    const file = new File([blob], "sanad-card.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "كارت سند", text: `كارت سند الطبي — ${info.code}` }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`كارت سند الطبي — ${info.code}`)}`, "_blank");
    }
  }
  function save() {
    const a = document.createElement("a");
    a.href = qr; a.download = `${info.code || "sanad-card"}.png`; a.click();
  }

  const face = "absolute inset-0 rounded-3xl p-5 [backface-visibility:hidden] overflow-hidden";

  return (
    <section className="mt-4" aria-label="كارت سند الطبي">
      <div className="[perspective:1200px]">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "اعرض وجه الكارت" : "اعرض رمز الكارت"}
          className="relative block h-56 w-full text-right transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          {/* الوجه الأمامي */}
          <div className={`${face} bg-surface-deep text-primary-foreground shadow-gold ring-1 ring-gold/50`}>
            <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-foreground/10 via-transparent to-transparent" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black tracking-widest text-gold">سَنَد | SANAD HEALTH PASS</p>
                <p className="mt-1 text-xs opacity-70">🇪🇬 الهوية الطبية</p>
              </div>
              <div className="h-8 w-11 rounded-md bg-gold/80 ring-1 ring-gold" aria-hidden />
            </div>
            <div className="relative mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{info.name}</p>
                {info.phone && <p className="text-xs opacity-75" dir="ltr">{info.phone}</p>}
                <p className="mt-2 font-mono text-xs tracking-wider text-gold" dir="ltr">{info.code}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] opacity-70">الفصيلة</p>
                <p className="text-4xl font-black leading-none">{info.blood || "—"}</p>
              </div>
            </div>
            {info.allergies && (
              <p className="relative mt-3 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> حساسية: {info.allergies}
              </p>
            )}
            <RotateCw className="absolute bottom-4 left-4 h-4 w-4 opacity-60" />
          </div>
          {/* الوجه الخلفي */}
          <div className={`${face} flex items-center gap-4 border border-border bg-card text-card-foreground [transform:rotateY(180deg)]`}>
            <div className="grid h-44 w-44 shrink-0 place-items-center rounded-2xl bg-background p-2">
              {qr ? <img src={qr} alt="رمز كارت سند" className="h-full w-full" /> : <span className="text-xs text-muted-foreground">جاري التجهيز…</span>}
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-extrabold">اعرضه على الاستقبال</p>
              <p className="mt-1 text-xs text-muted-foreground">بياناتك على جهازك فقط.</p>
              {info.contact && <p className="mt-3 text-xs">للطوارئ: <b>{info.contact}</b></p>}
              <p className="mt-1 text-xs">الإسعاف: <b>123</b></p>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button onClick={share} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-primary text-xs font-bold text-primary-foreground">
          <Share2 className="h-4 w-4" /> مشاركة
        </button>
        <button onClick={save} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary text-xs font-bold">
          <Download className="h-4 w-4" /> حفظ صورة
        </button>
        <button onClick={() => void build()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-border bg-secondary text-xs font-bold">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>
    </section>
  );
}
