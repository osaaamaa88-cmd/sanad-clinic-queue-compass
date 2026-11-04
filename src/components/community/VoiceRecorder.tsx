import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_SECONDS = 60;

export function VoiceRecorder({ value, onChange }: { value: Blob | null; onChange: (b: Blob | null) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!value) return setUrl("");
    const u = URL.createObjectURL(value);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  useEffect(() => {
    const onBg = () => stop();
    window.addEventListener("sanad:background", onBg);
    return () => {
      window.removeEventListener("sanad:background", onBg);
      stop();
    };
  }, []);

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
  }

  async function start() {
    if (typeof MediaRecorder === "undefined") return void toast.error("جهازك مش بيدعم التسجيل الصوتي");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (chunks.length) onChange(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      recRef.current = rec;
      rec.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error("اسمح للتطبيق باستخدام الميكروفون");
    }
  }

  if (value && url)
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-card p-2">
        <audio src={url} controls className="h-11 flex-1" />
        <button type="button" onClick={() => onChange(null)} aria-label="حذف التسجيل" className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    );

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-bold ${recording ? "border-destructive bg-destructive/10 text-destructive" : "border-dashed border-border text-muted-foreground"}`}
    >
      {recording ? (
        <>
          <Square className="h-4 w-4 fill-current" /> إيقاف التسجيل · {seconds}/{MAX_SECONDS} ث
        </>
      ) : (
        <>
          <Mic className="h-5 w-5" /> سجّل سؤالك بصوتك (حتى دقيقة)
        </>
      )}
    </button>
  );
}
