import { useEffect, useRef, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { decodeHealthPass, type HealthPass } from "@/lib/health-pass";

/** ماسح كارت سند للاستقبال — القراءة على الجهاز فقط ولا يُحفظ شيء. */
export function HealthPassScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("وجّه الكاميرا لكارت المريض");
  const [pass, setPass] = useState<{ p: HealthPass; expired: boolean } | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const canvas = document.createElement("canvas");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const jsQR = (await import("jsqr")).default;
        const loop = () => {
          if (stopped) return;
          if (v.videoWidth) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const c = canvas.getContext("2d", { willReadFrequently: true })!;
            c.drawImage(v, 0, 0);
            const code = jsQR(c.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            if (code?.data) {
              const r = decodeHealthPass(code.data);
              if (r.ok) {
                stopped = true;
                navigator.vibrate?.(60);
                stream?.getTracks().forEach((t) => t.stop());
                setPass({ p: r.pass, expired: r.expired });
                return;
              }
              setStatus(r.error);
            }
          }
          window.setTimeout(loop, 250);
        };
        loop();
      } catch {
        setStatus("اسمح باستخدام الكاميرا");
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const row = (label: string, value?: string) =>
    value ? (
      <div className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-left font-bold">{value}</span>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-background/80 p-4 backdrop-blur" dir="rtl" role="dialog" aria-label="مسح كارت سند">
      <div className="w-full max-w-sm rounded-3xl tile-3d border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">كارت سند للمريض</h2>
          <button onClick={onClose} aria-label="إغلاق" className="grid h-11 w-11 place-items-center rounded-full bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        {!pass ? (
          <>
            <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-2xl bg-secondary object-cover" />
            <p className="mt-3 text-center text-sm text-muted-foreground">{status}</p>
          </>
        ) : (
          <div>
            {pass.expired && (
              <p className="mb-2 flex items-center gap-2 rounded-xl bg-destructive/10 p-2 text-xs font-bold text-destructive">
                <AlertTriangle className="h-4 w-4" /> الكارت قديم، اطلب من المريض تحديثه
              </p>
            )}
            {row("الاسم", pass.p.name)}
            {row("الموبايل", pass.p.phone)}
            {row("الفصيلة", pass.p.bloodType)}
            {row("الحساسية", pass.p.allergies)}
            {row("أمراض مزمنة", pass.p.chronic)}
            {row("للطوارئ", [pass.p.contactName, pass.p.contactPhone].filter(Boolean).join(" — "))}
          </div>
        )}
      </div>
    </div>
  );
}
