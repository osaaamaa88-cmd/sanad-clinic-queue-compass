import { Camera as CameraIcon, Image as ImageIcon, Loader2, Mic, MicOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type NemoComposerProps = {
  need: string;
  onNeedChange: (value: string) => void;
  onSubmit: (text: string) => void;
  listening: boolean;
  /** Hands-free session is enabled (mic button state); differs from `listening`,
   * which is only true while recognition is actively running. */
  handsFree: boolean;
  loading: boolean;
  happy: boolean;
  senior: boolean;
  onCameraClick: () => void;
  onGalleryClick: () => void;
  onToggleListening: () => void;
};

export function NemoComposer({
  need,
  onNeedChange,
  onSubmit,
  listening,
  handsFree,
  loading,
  happy,
  senior,
  onCameraClick,
  onGalleryClick,
  onToggleListening,
}: NemoComposerProps) {
  return (
    <form
      aria-label="أرسل رسالة إلى نيمو"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(need);
      }}
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] order-3 mx-auto w-auto max-w-xl rounded-2xl border border-border bg-card p-2 shadow-lg md:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center gap-2">
        <input
          value={need}
          onChange={(event) => onNeedChange(event.target.value)}
          maxLength={800}
          aria-label="اكتب رسالتك لنيمو"
          placeholder={listening ? "نيمو بيسمعك… اتكلم براحتك" : "اكتب رسالتك لنيمو…"}
          className={`min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 ${
            senior ? "py-4 text-base" : "py-3 text-sm"
          } ${listening ? "border-rose-400" : "border-transparent"}`}
        />
        <Button
          type="button"
          onClick={onCameraClick}
          disabled={happy || loading}
          aria-label="التقط صورة بالكاميرا لتحليلها مع نيمو"
          title="التقط صورة بالكاميرا لتحليلها مع نيمو"
          variant="secondary"
          className={`shrink-0 place-items-center rounded-lg p-0 ${
            senior ? "grid h-14 w-14" : "grid h-11 w-11"
          }`}
        >
          <CameraIcon className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          onClick={onGalleryClick}
          disabled={happy || loading}
          aria-label="اختار صورة من المعرض لتحليلها مع نيمو"
          title="اختار صورة من المعرض لتحليلها مع نيمو"
          variant="secondary"
          className={`shrink-0 place-items-center rounded-lg p-0 ${
            senior ? "grid h-14 w-14" : "grid h-11 w-11"
          }`}
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          onClick={onToggleListening}
          disabled={happy}
          aria-pressed={handsFree}
          aria-label={handsFree ? "إيقاف المحادثة الصوتية" : "التحدث مع نيمو"}
          title={handsFree ? "إيقاف المحادثة الصوتية" : "التحدث مع نيمو"}
          variant={handsFree ? "destructive" : "secondary"}
          className={`shrink-0 place-items-center rounded-lg p-0 ${
            senior ? "grid h-14 w-14" : "grid h-11 w-11"
          }`}
        >
          {handsFree ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <button
          type="submit"
          disabled={loading || need.trim().length < 3}
          aria-label="إرسال الرسالة"
          className={`shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            senior ? "grid h-14 w-14" : "grid h-11 w-11"
          }`}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
      {listening && (
        <p className="px-3 pb-1 text-xs font-semibold text-rose-700" aria-live="polite">
          جاري الاستماع…
        </p>
      )}
    </form>
  );
}
