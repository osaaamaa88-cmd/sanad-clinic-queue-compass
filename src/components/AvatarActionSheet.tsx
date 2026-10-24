import { useRef } from "react";
import { Camera, ImageIcon, Trash2, Loader2, Eye } from "lucide-react";

/** Instagram-style bottom sheet: take photo / pick from gallery / remove current photo. */
export function AvatarActionSheet({
  open,
  onClose,
  hasPhoto,
  busy,
  onFile,
  onRemove,
  onViewStory,
}: {
  open: boolean;
  onClose: () => void;
  hasPhoto: boolean;
  busy?: boolean;
  onFile: (file: File) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  onViewStory?: () => void;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void onFile(f);
  };

  const row =
    "flex w-full items-center gap-3 px-5 py-4 text-sm font-bold transition-colors active:bg-secondary";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" />
        <p className="px-5 pb-2 pt-3 text-center text-sm font-extrabold">
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> جاري الرفع…
            </span>
          ) : (
            "الصورة الشخصية"
          )}
        </p>
        <div className="divide-y divide-border border-t border-border">
          {onViewStory && (
            <button
              className={row}
              onClick={() => {
                onClose();
                onViewStory();
              }}
            >
              <Eye className="h-5 w-5 text-gold" /> مشاهدة الستوري
            </button>
          )}
          <button className={row} disabled={busy} onClick={() => camRef.current?.click()}>
            <Camera className="h-5 w-5 text-gold" /> التقاط صورة بالكاميرا
          </button>
          <button className={row} disabled={busy} onClick={() => galRef.current?.click()}>
            <ImageIcon className="h-5 w-5 text-gold" /> اختيار من المعرض
          </button>
          {hasPhoto && (
            <button
              className={`${row} text-destructive`}
              disabled={busy}
              onClick={() => void onRemove()}
            >
              <Trash2 className="h-5 w-5" /> حذف الصورة الحالية
            </button>
          )}
          <button className={`${row} justify-center text-muted-foreground`} onClick={onClose}>
            إلغاء
          </button>
        </div>
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handle}
        />
        <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      </div>
    </div>
  );
}
