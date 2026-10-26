import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  X,
  Clock,
  Star,
  AlertTriangle,
  Settings,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StoryViewer } from "@/components/StoryViewer";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import {
  addStory,
  createHighlight,
  deleteStory,
  getClinicStories,
  parseCardStyle,
  type ClinicStories,
  type StoryItem,
} from "@/lib/stories";

export const Route = createFileRoute("/doctor/stories")({
  head: () => ({
    meta: [
      { title: "إدارة القصص | سند SANAD" },
      { name: "description", content: "انشر قصص عيادتك وتابع المشاهدات وثبّتها في الهايلايت." },
      { property: "og:title", content: "إدارة القصص | سند SANAD" },
      {
        property: "og:description",
        content: "انشر قصص عيادتك وتابع المشاهدات وثبّتها في الهايلايت.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { sitemap: false },
  component: DoctorStories,
});

const PEN_BGS = ["navy", "ocean", "emerald", "gold", "rose", "lavender", "sunset", "night"];
const PEN_FONTS = [
  ["alexandria", "عادي"],
  ["kufi", "كوفي"],
  ["ruqaa", "رقعة"],
  ["lalezar", "عريض"],
  ["amiri", "أميري"],
  ["marhey", "مرح"],
] as const;

const TAGS = ["تنويه هام", "تأخير في المواعيد", "حالة جديدة", "عرض خاص"];

function timeAgo(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return m < 1 ? "الآن" : `منذ ${m} د`;
  const h = Math.floor(m / 60);
  return h < 24 ? `منذ ${h} س` : `منذ ${Math.floor(h / 24)} يوم`;
}

function DoctorStories() {
  const clinicId = useDoctorClinicId();
  const [data, setData] = useState<ClinicStories | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [hours, setHours] = useState<12 | 24>(24);
  const [menu, setMenu] = useState(false);
  const [composer, setComposer] = useState(false);
  const [highlightId, setHighlightId] = useState<string>("");
  const [newHl, setNewHl] = useState("");
  const [busy, setBusy] = useState(false);
  const [pen, setPen] = useState(false);
  const [penBg, setPenBg] = useState("navy");
  const [penFont, setPenFont] = useState("alexandria");
  const [viewing, setViewing] = useState<{ items: StoryItem[]; i: number } | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (clinicId) setData(await getClinicStories(clinicId));
  }, [clinicId]);
  useEffect(() => {
    void load();
  }, [load]);

  const pick = (f?: File | null) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const publish = async () => {
    if (!clinicId || (!file && !caption.trim())) return toast.error("أضف صورة أو نصًا أولًا");
    setBusy(true);
    let hl: string | null = null;
    if (permanent) {
      hl = highlightId || null;
      if (!hl && newHl.trim()) hl = await createHighlight(clinicId, newHl.trim(), "✨");
      if (!hl) {
        setBusy(false);
        return toast.error("اختر هايلايت أو أنشئ واحدًا");
      }
    }
    if (pen && !caption.trim()) {
      setBusy(false);
      return toast.error("اكتب نص الحالة أولًا");
    }
    const r = await addStory({
      clinicId,
      file: pen ? null : file,
      cardStyle: pen ? `card:${penBg}:${penFont}` : undefined,
      caption: caption.trim(),
      tag,
      highlightId: hl,
      permanent,
      durationHours: hours,
      kind: tag === "تنويه هام" || tag === "تأخير في المواعيد" ? "urgent" : "story",
    });
    setBusy(false);
    if (!r.ok) return toast.error(r.error || "تعذر النشر");
    toast.success("تم نشر القصة");
    setFile(null);
    setPreview("");
    setCaption("");
    setTag("");
    setPermanent(false);
    setHours(24);
    setHighlightId("");
    setNewHl("");
    setComposer(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذه القصة؟")) return;
    if (await deleteStory(id)) {
      toast.success("تم الحذف");
      void load();
    } else toast.error("تعذر الحذف");
  };

  if (clinicId === null && data === null) {
    return (
      <AppShell title="إدارة القصص">
        <div className="p-6 text-center text-sm text-muted-foreground">
          سجّل الدخول كطبيب لإدارة القصص.{" "}
          <Link to="/doctor/login" className="font-bold text-primary">
            تسجيل الدخول
          </Link>
        </div>
      </AppShell>
    );
  }

  const active = data?.stories ?? [];
  return (
    <AppShell title="إدارة القصص">
      <div className="space-y-5 p-4" dir="rtl">
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="إنشاء"
            aria-expanded={menu}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft active:scale-95"
          >
            <Plus className="h-5 w-5" />
          </button>
          <Link
            to="/doctor-settings"
            className="inline-flex items-center gap-1 text-sm font-bold text-primary"
          >
            الإعدادات <ArrowRight className="h-4 w-4 rotate-180" />
          </Link>
          {menu && (
            <>
              <button
                type="button"
                aria-label="إغلاق"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenu(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-border bg-card py-1 text-sm font-bold shadow-xl"
              >
                <p className="px-4 pb-1 pt-2 text-[11px] text-muted-foreground">إنشاء</p>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setTag("");
                    setPermanent(false);
                    setComposer(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                >
                  <Camera className="h-4 w-4 text-primary" /> قصة (ستوري)
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setTag("تنويه هام");
                    setPermanent(false);
                    setComposer(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive" /> تنبيه عاجل للمرضى
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setTag("");
                    setPermanent(true);
                    setComposer(true);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-secondary"
                >
                  <Star className="h-4 w-4 text-gold" /> قصة دائمة (هايلايت)
                </button>
                {clinicId && (
                  <Link
                    role="menuitem"
                    to="/patient/clinic/$id"
                    params={{ id: clinicId }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-secondary"
                  >
                    <ImagePlus className="h-4 w-4 text-primary" /> منشور على صفحة العيادة
                  </Link>
                )}
                <Link
                  role="menuitem"
                  to="/doctor-settings"
                  className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 hover:bg-secondary"
                >
                  <Settings className="h-4 w-4 text-primary" /> إعدادات العيادة
                </Link>
              </div>
            </>
          )}
        </div>

        {composer && (
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold">
                {permanent ? "قصة دائمة" : tag === "تنويه هام" ? "تنبيه عاجل" : "قصة جديدة"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setComposer(false);
                  setPen(false);
                  setFile(null);
                  setPreview("");
                }}
                aria-label="إلغاء"
                className="rounded-full p-1.5 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => camRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold"
              >
                <Camera className="h-4 w-4" /> الكاميرا
              </button>
              <button
                type="button"
                onClick={() => galRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-bold"
              >
                <ImagePlus className="h-4 w-4" /> المعرض
              </button>
              <button
                type="button"
                aria-pressed={pen}
                onClick={() => {
                  setPen(!pen);
                  setFile(null);
                  setPreview("");
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${pen ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                <PenLine className="h-4 w-4" /> القلم
              </button>
              <input
                ref={camRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <input
                ref={galRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </div>
            {pen && (
              <div className="mt-3 space-y-3">
                <div
                  className={`relative mx-auto grid aspect-[9/16] max-h-96 place-items-center overflow-hidden rounded-2xl p-6 card-bg-${penBg}`}
                >
                  <textarea
                    autoFocus
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                    placeholder="اكتب حالتك…"
                    rows={5}
                    className={`w-full resize-none bg-transparent text-center text-2xl leading-relaxed text-white placeholder:text-white/60 outline-none font-card-${penFont}`}
                  />
                </div>
                <div className="flex justify-center gap-2">
                  {PEN_BGS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      aria-label={b}
                      onClick={() => setPenBg(b)}
                      className={`h-8 w-8 rounded-full card-bg-${b} ${penBg === b ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {PEN_FONTS.map(([f, l]) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPenFont(f)}
                      className={`rounded-full px-3 py-1.5 text-sm font-card-${f} ${penFont === f ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {preview && (
              <div className="relative mt-3 aspect-[9/16] max-h-80 overflow-hidden rounded-xl bg-black">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="h-full w-full object-contain" muted />
                ) : (
                  <img src={preview} alt="معاينة" className="h-full w-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                  }}
                  className="absolute left-2 top-2 rounded-full bg-black/60 p-2 text-white"
                  aria-label="إزالة"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
            {!pen && (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                placeholder="اكتب تعليقًا (اختياري)"
                rows={2}
                className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(tag === t ? "" : t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${tag === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> مدة ظهور القصة
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm font-bold">
              {([12, 24] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={!permanent && hours === h}
                  onClick={() => {
                    setPermanent(false);
                    setHours(h);
                  }}
                  className={`rounded-xl py-2.5 ${!permanent && hours === h ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {h} ساعة
                </button>
              ))}
              <button
                type="button"
                aria-pressed={permanent}
                onClick={() => setPermanent(true)}
                className={`rounded-xl py-2.5 ${permanent ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
              >
                دائمة
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {permanent
                ? "هتتثبت في الهايلايت على صفحة عيادتك."
                : `هتختفي تلقائيًا بعد ${hours} ساعة.`}
            </p>
            {permanent && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(data?.highlights ?? []).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setHighlightId(h.id);
                        setNewHl("");
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${highlightId === h.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {h.emoji} {h.title}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={newHl}
                    onChange={(e) => {
                      setNewHl(e.target.value.slice(0, 30));
                      setHighlightId("");
                    }}
                    placeholder="هايلايت جديد (مثل: النتائج)"
                    className="flex-1 rounded-xl border border-border bg-background p-2.5 text-sm"
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-extrabold text-primary-foreground disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{" "}
              {permanent ? "نشر في الهايلايت" : `نشر لمدة ${hours} ساعة`}
            </button>
          </section>
        )}

        <section>
          <h2 className="mb-2 font-extrabold">القصص النشطة ({active.length})</h2>
          {!data && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}
          {data && active.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد قصص نشطة الآن.</p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {active.map((s, i) => (
              <div
                key={s.id}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setViewing({ items: active, i })}
                  className="block aspect-[9/16] w-full bg-black"
                >
                  {s.url ? (
                    s.mediaType === "video" ? (
                      <video src={s.url} className="h-full w-full object-cover" muted />
                    ) : (
                      <img
                        src={s.url}
                        alt={s.caption || "قصة"}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <span
                      className={`flex h-full items-center justify-center p-2 text-center text-xs text-white ${parseCardStyle(s.tag) ? `card-bg-${parseCardStyle(s.tag)!.bg} font-card-${parseCardStyle(s.tag)!.font}` : ""}`}
                    >
                      {s.caption}
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-between p-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />
                    {s.views ?? 0}
                  </span>
                  <span>{timeAgo(s.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="text-destructive"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {(data?.highlights ?? []).length > 0 && (
          <section>
            <h2 className="mb-2 font-extrabold">الهايلايت</h2>
            <div className="flex gap-3 overflow-x-auto">
              {data!.highlights.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => h.items.length && setViewing({ items: h.items, i: 0 })}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-secondary text-2xl">
                    {h.items[0]?.url ? (
                      <img src={h.items[0].url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      h.emoji
                    )}
                  </span>
                  <span className="truncate text-[11px] font-bold">
                    {h.title} ({h.items.length})
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {viewing && (
        <StoryViewer
          items={viewing.items}
          startIndex={viewing.i}
          title="قصتك"
          isOwner
          clinicId={clinicId ?? undefined}
          onClose={() => setViewing(null)}
          onDelete={(id) => {
            setViewing(null);
            void remove(id);
          }}
        />
      )}
    </AppShell>
  );
}
