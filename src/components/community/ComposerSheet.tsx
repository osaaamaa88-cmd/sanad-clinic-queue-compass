import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus, Lock, Phone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { specialties } from "@/lib/mock-data";
import { compressImage } from "@/lib/media-upload";
import { hasSelfHarmIntent, runLocalTriage } from "@/lib/triage-local";
import { AMBULANCE_LINE, MENTAL_HEALTH_PORTAL_URL, PSYCH_SUPPORT_LINE } from "@/lib/crisis-support";
import { detectPersonalData, PERSONAL_DATA_LABEL } from "./community-logic";
import { VoiceRecorder } from "./VoiceRecorder";

const BGS = ["navy", "ocean", "emerald", "gold", "rose", "lavender", "sunset", "night"] as const;
const FONTS = [
  { id: "alexandria", label: "عصري" },
  { id: "kufi", label: "كوفي" },
  { id: "ruqaa", label: "رقعة" },
  { id: "lalezar", label: "عريض" },
  { id: "amiri", label: "نسخ" },
  { id: "marhey", label: "مرح" },
] as const;

type PostType = "question" | "experience" | "tip" | "card";
const DRAFT_KEY = "sanad_community_draft_v1";

type Draft = { type: PostType; body: string; spec: string; anon: boolean; bg: string; font: string };

export function ComposerSheet({
  initialType,
  userId,
  userName,
  clinicId,
  onClose,
  onDone,
}: {
  initialType: PostType;
  userId: string;
  userName: string;
  clinicId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const isDoctor = !!clinicId;
  const [type, setType] = useState<PostType>(initialType);
  const [body, setBody] = useState("");
  const [spec, setSpec] = useState("");
  const [anon, setAnon] = useState(false);
  const [bg, setBg] = useState<string>("navy");
  const [font, setFont] = useState<string>("alexandria");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState<Blob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      if (readPrefs().anonymousDefault) setAnon(true);
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as Draft | null;
      if (d && d.body) {
        if (initialType === "card" ? d.type === "card" : d.type !== "card") setType(d.type);
        setBody(d.body);
        setSpec(d.spec);
        setAnon(d.anon);
        setBg(d.bg);
        setFont(d.font);
      }
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, [initialType]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ type, body, spec, anon, bg, font }));
    }, 400);
    return () => window.clearTimeout(t);
  }, [type, body, spec, anon, bg, font]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const isCard = type === "card";
  const pii = detectPersonalData(body);
  const selfHarm = body.trim().length > 3 && hasSelfHarmIntent(body);
  const emergency = !selfHarm && body.trim().length > 3 && runLocalTriage(body).urgency === "emergency";

  const pick = async (input?: File) => {
    if (!input) return;
    if (!input.type.startsWith("image/")) return void toast.error("اختر صورة فقط");
    const { compressImage } = await import("@/lib/image-compression");
    const f = await compressImage(input);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (isCard) setType("question");
  };

  const submit = async () => {
    if (busy) return;
    if (pii.length) return void toast.error("احذف البيانات الشخصية قبل النشر");
    if (isCard && !body.trim()) return void toast.error("اكتب نص البطاقة");
    if (!isCard && !body.trim() && !file && !voice) return void toast.error("اكتب نصاً أو أضف صورة أو تسجيلاً");
    setBusy(true);
    try {
      let image_path = "";
      if (!isCard && !file && voice) {
        const ext = voice.type.includes("mp4") ? "m4a" : voice.type.includes("ogg") ? "ogg" : "webm";
        image_path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("community").upload(image_path, voice, { contentType: voice.type });
        if (error) throw error;
      }
      if (!isCard && file) {
        const small = await compressImage(file, 1440, 0.8);
        const ext = small.name.split(".").pop() || "jpg";
        image_path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("community").upload(image_path, small, { contentType: small.type });
        if (error) throw error;
      }
      const { error } = await supabase.from("community_posts").insert({
        author_id: userId,
        author_name: userName,
        is_anonymous: isDoctor ? false : anon,
        clinic_id: clinicId,
        kind: isCard ? "card" : file ? "image" : voice && image_path ? "voice" : "text",
        post_type: isCard ? "experience" : type === "tip" && !isDoctor ? "question" : type,
        body: body.trim().slice(0, isCard ? 280 : 2000),
        bg_style: isCard ? bg : "",
        font_style: isCard ? font : "",
        image_path,
        specialty_id: spec,
      });
      if (error) throw error;
      localStorage.removeItem(DRAFT_KEY);
      toast.success("تم النشر 💙");
      onDone();
    } catch {
      toast.error("تعذّر النشر، حاول مرة أخرى");
    } finally {
      setBusy(false);
    }
  };

  const types: { id: PostType; label: string }[] = [
    { id: "question", label: "سؤال" },
    { id: "experience", label: "تجربة" },
    ...(isDoctor ? [{ id: "tip" as const, label: "نصيحة" }] : []),
    { id: "card", label: "بطاقة" },
  ];

  return (
    <div className="community-sheet fixed inset-0 z-[120] flex flex-col bg-background" dir="rtl" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button type="button" onClick={onClose} aria-label="إغلاق" className="grid h-11 w-11 place-items-center rounded-full hover:bg-secondary">
          <X className="h-5 w-5" />
        </button>
        <span className="text-base font-extrabold">منشور جديد</span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || pii.length > 0}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "..." : "نشر"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
          {types.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setType(t.id);
                if (t.id === "card") {
                  setFile(null);
                  setPreview("");
                }
              }}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${type === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isCard ? (
          <div className={`card-bg-${bg} card-ink relative mx-4 mt-3 grid min-h-[45vh] place-items-center rounded-2xl px-6`}>
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={280}
              placeholder="اكتب ما يدور في بالك..."
              className={`font-card-${font} w-full resize-none bg-transparent text-center text-3xl leading-relaxed outline-none placeholder:text-current placeholder:opacity-60`}
              rows={5}
            />
            <span className="absolute bottom-3 left-4 text-xs opacity-70">{body.length}/280</span>
          </div>
        ) : (
          <div className="p-4">
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder={
                type === "tip"
                  ? "شارك نصيحة أو معلومة طبية..."
                  : type === "experience"
                    ? "احكِ تجربتك لتفيد غيرك..."
                    : "اشرح سؤالك... (السن، الأعراض، المدة)"
              }
              className="w-full resize-none bg-transparent text-base leading-relaxed outline-none"
            />
            {preview ? (
              <>
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
                  <img src={preview} alt="" className="max-h-80 w-full bg-secondary object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPreview("");
                    }}
                    aria-label="إزالة الصورة"
                    className="absolute left-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-background/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 rounded-xl bg-warning/15 px-3 py-2 text-xs font-bold text-foreground">
                  تأكد إنك خفيت الاسم والرقم القومي من التحليل أو الروشتة قبل النشر.
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-6 text-sm font-bold text-muted-foreground"
              >
                <ImagePlus className="h-5 w-5" /> أضف صورة (تحليل، أشعة، روشتة...)
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
            {!file && <VoiceRecorder value={voice} onChange={setVoice} />}
          </div>
        )}

        <div className="space-y-3 px-4 pb-8 pt-3">
          {pii.length > 0 && (
            <div className="flex gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-bold text-foreground">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              المنشور فيه {pii.map((k) => PERSONAL_DATA_LABEL[k]).join("، ")}. احذفه عشان نقدر ننشر ونحمي خصوصيتك.
            </div>
          )}
          {selfHarm && (
            <div className="space-y-2 rounded-2xl border border-primary/40 bg-primary-soft p-3 text-sm leading-relaxed">
              <p className="font-extrabold">إنت مش لوحدك 💙</p>
              <p>لو حاسس بخطر على نفسك دلوقتي اتصل بالإسعاف. ولو محتاج حد يسمعك، خط الدعم النفسي لوزارة الصحة شغال 24 ساعة.</p>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:${AMBULANCE_LINE}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-destructive px-4 font-bold text-destructive-foreground">
                  <Phone className="h-4 w-4" /> {AMBULANCE_LINE}
                </a>
                <a href={`tel:${PSYCH_SUPPORT_LINE}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground">
                  <Phone className="h-4 w-4" /> {PSYCH_SUPPORT_LINE}
                </a>
                <a href={MENTAL_HEALTH_PORTAL_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 font-bold">
                  بوابة الصحة النفسية
                </a>
              </div>
            </div>
          )}
          {emergency && (
            <a href={`tel:${AMBULANCE_LINE}`} className="flex min-h-11 items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-bold">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              لو الحالة طارئة متستناش رد، اتصل {AMBULANCE_LINE} فوراً.
            </a>
          )}

          {isCard && (
            <>
              <div className="flex flex-wrap gap-2.5">
                {BGS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    aria-label={b}
                    onClick={() => setBg(b)}
                    className={`card-bg-${b} h-11 w-11 rounded-full ${bg === b ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(f.id)}
                    className={`font-card-${f.id} min-h-11 rounded-xl border px-3 text-base ${font === f.id ? "border-primary bg-primary-soft text-primary" : "border-border"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
          <select
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            aria-label="التخصص"
            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
          >
            <option value="">تخصص عام</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
          {!isDoctor && (
            <label className="flex min-h-11 items-center justify-between rounded-2xl bg-secondary p-3 text-sm font-bold">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> انشر بدون اسم
              </span>
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-5 w-5 accent-primary" />
            </label>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            المجتمع للتوعية فقط ولا يغني عن الكشف الطبي. متكتبش رقمك أو بياناتك الشخصية.
          </p>
        </div>
      </div>
    </div>
  );
}
