import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ScanLine } from "lucide-react";

export const Route = createFileRoute("/patient/scan")({
  head: () => ({
    meta: [
      { title: "مسح كود العيادة | سند" },
      { name: "description", content: "امسح كود QR الخاص بالعيادة أو كارت الطوارئ بالكاميرا." },
      { property: "og:title", content: "مسح كود العيادة | سند" },
      { property: "og:description", content: "امسح كود QR الخاص بالعيادة أو كارت الطوارئ بالكاميرا." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: ScanPage,
});

function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState("وجّه الكاميرا ناحية الكود");
  const [result, setResult] = useState("");

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
            if (code?.data) return handle(code.data);
          }
          window.setTimeout(loop, 250);
        };
        loop();
      } catch {
        setStatus("اسمح للتطبيق باستخدام الكاميرا علشان تمسح الكود");
      }
    })();
    function handle(text: string) {
      stopped = true;
      navigator.vibrate?.(60);
      try {
        const u = new URL(text, window.location.origin);
        if (u.origin === window.location.origin) return void navigate({ to: u.pathname + u.search });
      } catch {
        /* not a URL */
      }
      setResult(text);
      setStatus("تمت قراءة الكود");
    }
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-4 pb-32" dir="rtl">
      <Link to="/patient" className="inline-flex min-h-11 items-center gap-2 font-bold text-foreground">
        <ArrowRight className="h-5 w-5" /> رجوع
      </Link>
      <h1 className="mt-2 flex items-center gap-2 text-xl font-extrabold"><ScanLine className="h-6 w-6 text-primary" /> امسح الكود</h1>
      <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-3xl bg-surface-deep">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-primary/80" />
      </div>
      <p className="mt-4 text-center font-bold text-muted-foreground">{status}</p>
      {result && <p className="mt-2 break-all rounded-2xl bg-card p-3 text-sm text-foreground">{result}</p>}
    </div>
  );
}
