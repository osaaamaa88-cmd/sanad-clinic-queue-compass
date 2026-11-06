import { useEffect, useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import { loadVault } from "@/lib/offline-db";
import { getPatientSession } from "@/lib/patient-session";
import { encodeHealthPass } from "@/lib/health-pass";

/** كارت سند: QR يحمل الملف الطبي المختصر، يتولد على الجهاز ويعمل بدون إنترنت. */
export function SanadHealthPassCard() {
  const [qr, setQr] = useState<string>("");
  const [name, setName] = useState("");
  const [blood, setBlood] = useState("");

  async function build() {
    const s = getPatientSession();
    const v = await loadVault();
    const n = s?.name ?? "مريض سند";
    setName(n);
    setBlood(v?.bloodType ?? "");
    const text = encodeHealthPass({
      name: n, phone: s?.phone, bloodType: v?.bloodType, allergies: v?.allergies,
      chronic: v?.chronic, contactName: v?.contactName, contactPhone: v?.contactPhone,
      issuedAt: Date.now(),
    });
    const QR = (await import("qrcode")).default;
    setQr(await QR.toDataURL(text, { margin: 1, width: 360, errorCorrectionLevel: "M" }));
  }

  useEffect(() => { void build(); }, []);

  return (
    <section className="mt-4 rounded-3xl tile-3d border border-border bg-card p-4" aria-label="كارت سند الطبي">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          <QrCode className="h-5 w-5 text-primary" /> كارت سند
        </h2>
        <button onClick={() => void build()} aria-label="تحديث الكارت"
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-secondary">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="grid h-36 w-36 shrink-0 place-items-center rounded-2xl bg-background p-2">
          {qr ? <img src={qr} alt="رمز كارت سند" className="h-full w-full" /> : <span className="text-xs text-muted-foreground">جاري التجهيز…</span>}
        </div>
        <div className="min-w-0 text-sm">
          <p className="truncate font-bold">{name}</p>
          {blood && <p className="mt-1 text-muted-foreground">الفصيلة: <b className="text-foreground">{blood}</b></p>}
          <p className="mt-2 text-xs text-muted-foreground">اعرضه على الاستقبال. بياناتك على جهازك فقط.</p>
        </div>
      </div>
    </section>
  );
}
