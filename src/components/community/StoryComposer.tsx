import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { addMemberStory } from "./member-stories";
import { detectPersonalData, PERSONAL_DATA_LABEL } from "./community-logic";

const BGS = ["navy", "ocean", "emerald", "gold", "rose", "lavender", "sunset", "night"] as const;
const FONTS = [
  { id: "alexandria", label: "عصري" },
  { id: "kufi", label: "كوفي" },
  { id: "ruqaa", label: "رقعة" },
  { id: "amiri", label: "نسخ" },
  { id: "marhey", label: "مرح" },
] as const;

/** WhatsApp-style status composer: colored text or a photo with caption, visible 24 hours. */
export function StoryComposer({
  userId,
  userName,
  onClose,
  onDone,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [bg, setBg] = useState<string>("emerald");
  const [font, setFont] = useState<string>("alexandria");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pii = detectPersonalData(text);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error("اختر صورة فقط");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (busy) return;
    if (pii.length) return void toast.error("احذف البيانات الشخصية قبل النشر");
    if (!file && !text.trim()) return void toast.error("اكتب حالتك أو أضف صورة");
    setBusy(true);
    try {
      await addMemberStory({ userId, userName, caption: text, bg, font, file });
      toast.success("تم نشر حالتك لمدة 24 ساعة");
      onDone();
    } catch {
      toast.error("تعذّر نشر الحالة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer.Root open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[100] bg-surface-deep/60" />
        <Drawer.Content
          dir="rtl"
          className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[92vh] flex-col rounded-t-[28px] border-t border-border bg-card focus:outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          <Drawer.Title className="px-4 py-3 text-center text-base font-extrabold">حالة جديدة</Drawer.Title>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
            <div
              className={`relative grid aspect-[9/12] max-h-[46vh] w-full place-items-center overflow-hidden rounded-3xl ${preview ? "bg-surface-deep" : `card-bg-${bg}`}`}
            >
              {preview ? (
                <>
                  <img src={preview} alt="" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    aria-label="إزالة الصورة"
                    onClick={() => {
                      setFile(null);
                      setPreview("");
                    }}
                    className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-surface-deep/70 text-primary-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={280}
                  placeholder="اكتب حالتك..."
                  className={`font-${font} h-full w-full resize-none bg-transparent p-6 text-center text-2xl font-bold leading-relaxed text-primary-foreground outline-none placeholder:text-primary-foreground/60`}
                  style={{ paddingTop: "30%" }}
                />
              )}
            </div>
            {preview && (
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={280}
                placeholder="أضف تعليقاً على الصورة..."
                className="h-11 w-full rounded-full bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            )}
            {pii.length > 0 && (
              <p className="text-xs font-bold text-destructive">
                احذف {pii.map((k) => PERSONAL_DATA_LABEL[k]).join("، ")} لحماية خصوصيتك.
              </p>
            )}
            {!preview && (
              <>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {BGS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-label={`خلفية ${b}`}
                      onClick={() => setBg(b)}
                      className={`card-bg-${b} h-11 w-11 shrink-0 rounded-full ${bg === b ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFont(f.id)}
                      className={`font-${f.id} min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${font === f.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground">
              تظهر حالتك لأعضاء مجتمع سند لمدة 24 ساعة ثم تختفي تلقائياً. تقدر تشوف مين شافها.
            </p>
          </div>
          <div className="flex gap-2 border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-bold"
            >
              <ImagePlus className="h-5 w-5" /> صورة
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="min-h-11 flex-1 rounded-full bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "جارٍ النشر..." : "نشر الحالة"}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
