import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Copy, Sparkles, Loader2, Plus, Search, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { analyzeFood, suggestEgyptianAlternatives, type Alternative, type FoodAnalysis } from "@/lib/nutrition.functions";

export const Route = createFileRoute("/nutrition")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "التغذية والسعرات — سَنَد" },
      { name: "description", content: "صوّر أكلك واعرف سعراته، احسب احتياجك اليومي وتابع وجباتك على سَنَد." },
      { property: "og:title", content: "التغذية والسعرات — سَنَد" },
      { property: "og:description", content: "تحليل الأكل بالكاميرا، عداد سعرات يومي، وأنظمة غذائية جاهزة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Nutrition,
});

type Meal = "فطور" | "غداء" | "عشاء" | "سناك";
type Entry = FoodAnalysis & { id: string; meal: Meal; at: string };
type Profile = { sex: "m" | "f"; age: number; height: number; weight: number; activity: number; goal: "lose" | "keep" | "gain" };

const LOG_KEY = "sanad_nutrition_log_v1";
const PROFILE_KEY = "sanad_nutrition_profile_v1";
const MEALS: Meal[] = ["فطور", "غداء", "عشاء", "سناك"];
const ACTIVITY = [
  { v: 1.2, l: "قليل الحركة" },
  { v: 1.375, l: "نشاط خفيف" },
  { v: 1.55, l: "نشاط متوسط" },
  { v: 1.725, l: "نشاط عالي" },
];
const PLANS = [
  { t: "نظام مرضى السكري", d: "فطور: فول بزيت زيتون + نص رغيف بلدي + خيار\nغداء: فراخ مشوية + خضار سوتيه + ٣ معالق رز بني\nعشاء: زبادي لايت + خيار أو بيضة مسلوقة\nتجنب: العصائر والسكريات والعيش الأبيض الكتير، وقسّم الأكل ٥ وجبات صغيرة." },
  { t: "نظام DASH للضغط", d: "قلّل الملح لأقل من معلقة صغيرة يومياً\nفطور: شوفان بلبن خالي الدسم + موزة\nغداء: سمك مشوي + سلطة خضرا + بطاطس مسلوقة\nعشاء: جبنة قريش + خضار\nتجنب: المخللات والجبن المالح واللحوم المصنعة." },
  { t: "نظام إنقاص الوزن", d: "عجز ٥٠٠ سعر عن احتياجك اليومي\nفطور: ٢ بيض مسلوق + خضار + نص رغيف\nغداء: بروتين مشوي + طبق سلطة كبير + نشويات صغيرة\nعشاء: زبادي + فاكهة\nاشرب ٨ أكواب مية وامشِ ٣٠ دقيقة يومياً." },
];

const today = () => new Date().toDateString();

function calcTarget(p: Profile) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * p.activity;
  return Math.round(p.goal === "lose" ? tdee - 500 : p.goal === "gain" ? tdee + 300 : tdee);
}

function fileToBase64(file: File): Promise<{ data: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * scale;
      c.height = img.height * scale;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      resolve({ data: c.toDataURL("image/jpeg", 0.8).split(",")[1], mime: "image/jpeg" });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function Nutrition() {
  const [log, setLog] = useState<Entry[]>([]);
  const [profile, setProfile] = useState<Profile>({ sex: "m", age: 30, height: 170, weight: 75, activity: 1.375, goal: "keep" });
  const [meal, setMeal] = useState<Meal>("غداء");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [altQ, setAltQ] = useState("");
  const [altBusy, setAltBusy] = useState(false);
  const [alts, setAlts] = useState<Alternative[]>([]);

  useEffect(() => {
    try {
      setLog(JSON.parse(localStorage.getItem(LOG_KEY) || "[]"));
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile(JSON.parse(p));
    } catch { /* ignore */ }
  }, []);

  const saveLog = (l: Entry[]) => { setLog(l); localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(0, 300))); };
  const updProfile = (p: Partial<Profile>) => {
    const n = { ...profile, ...p };
    setProfile(n);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(n));
  };

  const target = calcTarget(profile);
  const todays = log.filter((e) => new Date(e.at).toDateString() === today());
  const eaten = todays.reduce((s, e) => s + e.calories, 0);
  const macros = todays.reduce((s, e) => ({ p: s.p + e.protein, c: s.c + e.carbs, f: s.f + e.fat }), { p: 0, c: 0, f: 0 });
  const pct = Math.min(1, eaten / Math.max(1, target));
  const R = 54, C = 2 * Math.PI * R;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const total = log.filter((e) => new Date(e.at).toDateString() === d.toDateString()).reduce((s, e) => s + e.calories, 0);
    return { label: d.toLocaleDateString("ar-EG", { weekday: "short" }), total };
  });
  const maxWeek = Math.max(target, ...week.map((w) => w.total));

  async function run(input: { image?: string; mime?: string; text?: string }) {
    setBusy(true);
    setResult(null);
    try {
      setResult(await analyzeFood({ data: input }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حصلت مشكلة");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(f?: File) {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    const { data, mime } = await fileToBase64(f);
    await run({ image: data, mime });
  }

  async function askAlts(q: string) {
    if (!q.trim() || altBusy) return;
    setAltQ(q); setAltBusy(true); setAlts([]);
    try {
      const r = await suggestEgyptianAlternatives({ data: { query: q, goal: profile.goal, target, eaten, recent: log.slice(0, 15).map((e) => e.name) } });
      if (r.error) toast.error(r.error); else setAlts(r.alternatives);
    } catch { toast.error("تعذر اقتراح بدائل دلوقتي"); } finally { setAltBusy(false); }
  }

  function addAlt(a: Alternative) {
    saveLog([{ name: a.name, calories: a.calories, protein: a.protein, carbs: a.carbs, fat: a.fat, fiber: 0, items: [], advice: a.tip, id: crypto.randomUUID(), meal, at: new Date().toISOString() }, ...log]);
    toast.success(`اتضافت لـ${meal}`);
  }

  function addResult() {
    if (!result) return;
    saveLog([{ ...result, id: crypto.randomUUID(), meal, at: new Date().toISOString() }, ...log]);
    setResult(null); setPreview(null); setText("");
    toast.success("اتضافت للوجبات");
  }

  const num = "w-full rounded-xl border border-border bg-background px-2 py-2 text-center text-sm font-bold";

  return (
    <AppShell title="التغذية والسعرات" subtitle="صوّر أكلك واعرف سعراته" backTo={toolsBack}>
      <div className="space-y-4 pb-28">
        {/* Ring */}
        <section className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft">
          <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" className="stroke-muted" strokeWidth="10" />
            <circle cx="60" cy="60" r={R} fill="none" className={eaten > target ? "stroke-destructive" : "stroke-primary"} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .6s" }} />
            <text x="60" y="58" textAnchor="middle" className="rotate-90 fill-foreground text-[20px] font-extrabold" transform="rotate(90 60 60)">{eaten}</text>
            <text x="60" y="76" textAnchor="middle" className="fill-muted-foreground text-[10px]" transform="rotate(90 60 60)">من {target}</text>
          </svg>
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-extrabold">{eaten > target ? `زيادة ${eaten - target} سعر` : `فاضلك ${target - eaten} سعر`}</p>
            <p className="text-xs text-muted-foreground">بروتين {macros.p}ج • كارب {macros.c}ج • دهون {macros.f}ج</p>
          </div>
        </section>

        {/* Analyze */}
        <section className="rounded-3xl border border-primary/30 bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Camera className="h-5 w-5 text-primary" /> سجّل وجبة</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {MEALS.map((m) => (
              <button key={m} type="button" onClick={() => setMeal(m)} className={`rounded-xl border px-1 py-2 text-xs font-bold ${meal === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{m}</button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="gradient-primary mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-extrabold text-primary-foreground active:scale-95 disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} صوّر الطبق
          </button>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { setPreview(null); void run({ text }); } }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="أو اكتب: طبق كشري وسط" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary" aria-label="تحليل"><Search className="h-4 w-4" /></button>
          </form>

          {preview && <img src={preview} alt="الطبق" className="mt-3 max-h-56 w-full rounded-2xl object-cover" />}
          {busy && <p className="mt-3 text-center text-xs text-muted-foreground">بنحلل الأكل…</p>}
          {result && (
            <div className="mt-3 rounded-2xl bg-primary-soft/40 p-3">
              <div className="flex items-center justify-between">
                <p className="font-extrabold">{result.name}</p>
                <p className="text-lg font-extrabold text-primary">{result.calories} سعر</p>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
                {[["بروتين", result.protein], ["كارب", result.carbs], ["دهون", result.fat], ["ألياف", result.fiber]].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-card p-1.5"><b className="block text-sm">{v}ج</b>{l}</div>
                ))}
              </div>
              {result.items.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {result.items.map((i, k) => <li key={k} className="flex justify-between gap-2"><span>{i.name} <span className="text-muted-foreground">({i.amount})</span></span><span>{i.calories}</span></li>)}
                </ul>
              )}
              {result.advice && <p className="mt-2 text-xs text-muted-foreground">💡 {result.advice}</p>}
              {result.calories > 0 && (
                <button type="button" onClick={addResult} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground"><Plus className="h-4 w-4" /> أضف لـ{meal}</button>
              )}
            </div>
          )}
        </section>

        {/* Egyptian alternatives */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-soft">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Sparkles className="h-5 w-5 text-primary" /> بدائل مصرية ذكية</h2>
          <p className="mt-1 text-xs text-muted-foreground">اكتب الأكلة اللي نفسك فيها أو هدفك، ونقترحلك بدائل تناسب الـ{Math.max(0, target - eaten)} سعر الفاضلين وسجل أكلك.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["بديل صحي للحواوشي", "بديل للكشري", "عشاء خفيف مشبع", "سناك عالي البروتين"].map((q) => (
              <button key={q} type="button" disabled={altBusy} onClick={() => void askAlts(q)} className="rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-primary active:scale-95">{q}</button>
            ))}
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void askAlts(altQ); }}>
            <input value={altQ} onChange={(e) => setAltQ(e.target.value)} placeholder="مثلاً: نفسي في شاورما" className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button disabled={altBusy} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground" aria-label="اقترح">{altBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}</button>
          </form>
          {altBusy && <p className="mt-3 text-center text-xs text-muted-foreground">بنجهزلك بدائل…</p>}
          {alts.length > 0 && (
            <ul className="mt-3 space-y-2">
              {alts.map((a, i) => (
                <li key={i} className="rounded-2xl bg-primary-soft/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="font-extrabold">{a.name}</p><p className="text-[11px] text-muted-foreground">{a.amount}</p></div>
                    <p className="shrink-0 font-extrabold text-primary">{a.calories} سعر</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">بروتين {a.protein}ج • كارب {a.carbs}ج • دهون {a.fat}ج</p>
                  {a.saving && <p className="mt-1 text-xs font-bold text-success">{a.saving}</p>}
                  {a.tip && <p className="mt-1 text-xs text-muted-foreground">💡 {a.tip}</p>}
                  <button type="button" onClick={() => addAlt(a)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"><Plus className="h-4 w-4" /> أضف لـ{meal}</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Today meals */}
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><Utensils className="h-4 w-4" /> وجبات النهارده</h3>
          {todays.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">لسه ما سجلتش أكل النهارده.</p>
          ) : (
            <ul className="space-y-2">
              {todays.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs">
                  <span className="rounded-lg bg-primary-soft px-2 py-1 font-bold text-primary">{e.meal}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{e.name}</span>
                  <span className="font-extrabold">{e.calories}</span>
                  <button type="button" aria-label="حذف" onClick={() => saveLog(log.filter((x) => x.id !== e.id))} className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Week */}
        <section className="rounded-3xl border border-border bg-card p-4">
          <h3 className="text-sm font-extrabold">آخر ٧ أيام</h3>
          <div className="mt-3 flex h-28 items-end gap-2">
            {week.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className={`w-full rounded-t-lg ${w.total > target ? "bg-destructive/70" : "bg-primary/70"}`} style={{ height: `${(w.total / maxWeek) * 90}px` }} />
                <span className="text-[10px] text-muted-foreground">{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Profile */}
        <section className="rounded-3xl border border-border bg-card p-4">
          <h3 className="text-sm font-extrabold">احتياجك اليومي: <span className="text-primary">{target} سعر</span></h3>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <label>السن<input type="number" className={num} value={profile.age} onChange={(e) => updProfile({ age: +e.target.value || 0 })} /></label>
            <label>الطول سم<input type="number" className={num} value={profile.height} onChange={(e) => updProfile({ height: +e.target.value || 0 })} /></label>
            <label>الوزن كجم<input type="number" className={num} value={profile.weight} onChange={(e) => updProfile({ weight: +e.target.value || 0 })} /></label>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["m", "f"] as const).map((s) => <button key={s} type="button" onClick={() => updProfile({ sex: s })} className={`rounded-xl border py-2 text-xs font-bold ${profile.sex === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s === "m" ? "ذكر" : "أنثى"}</button>)}
          </div>
          <select value={profile.activity} onChange={(e) => updProfile({ activity: +e.target.value })} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
            {ACTIVITY.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
          </select>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {([["lose", "إنقاص"], ["keep", "تثبيت"], ["gain", "زيادة"]] as const).map(([g, l]) => <button key={g} type="button" onClick={() => updProfile({ goal: g })} className={`rounded-xl border py-2 text-xs font-bold ${profile.goal === g ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l} الوزن</button>)}
          </div>
        </section>

        {/* Plans */}
        <section>
          <h3 className="mb-2 text-sm font-extrabold">أنظمة غذائية جاهزة (للمرضى والأطباء)</h3>
          <div className="space-y-2">
            {PLANS.map((p) => (
              <details key={p.t} className="rounded-2xl border border-border bg-card p-3">
                <summary className="cursor-pointer text-sm font-bold">{p.t}</summary>
                <p className="mt-2 whitespace-pre-line text-xs leading-6 text-muted-foreground">{p.d}</p>
                <button type="button" onClick={() => { void navigator.clipboard.writeText(`${p.t}\n${p.d}`); toast.success("اتنسخ — ابعته للمريض في الرسائل"); }} className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"><Copy className="h-3.5 w-3.5" /> نسخ للمشاركة</button>
              </details>
            ))}
          </div>
        </section>

        <p className="rounded-xl bg-secondary/50 p-3 text-center text-[11px] text-muted-foreground">السعرات تقديرية بالذكاء الاصطناعي ولا تغني عن استشارة أخصائي التغذية.</p>
      </div>
    </AppShell>
  );
}
