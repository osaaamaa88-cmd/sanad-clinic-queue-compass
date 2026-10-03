import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Droplet, Heart, Save, Siren, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/patient/health")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — حاسبة ومؤشرات الصحة" },
      { name: "description", content: "احسب ضغط الدم والسكر واحفظ قراءاتك في ملفك الطبي." },
    ],
  }),
  component: HealthTracker,
});

type BPCategory = {
  label: string;
  tone: "success" | "warning" | "orange" | "destructive" | "crisis";
  advice: string;
};

function evaluateBP(sys: number, dia: number): BPCategory {
  if (sys > 180 || dia > 120)
    return {
      label: "أزمة ضغط — طوارئ",
      tone: "crisis",
      advice: "توجّه فوراً لأقرب مستشفى أو عيادة طوارئ. لا تنتظر.",
    };
  if (sys >= 140 || dia >= 90)
    return {
      label: "ارتفاع — المرحلة الثانية",
      tone: "destructive",
      advice: "يفضّل مراجعة الطبيب في أقرب وقت لبدء أو تعديل العلاج.",
    };
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89))
    return {
      label: "ارتفاع — المرحلة الأولى",
      tone: "orange",
      advice: "غيّر نمط حياتك (ملح أقل، نشاط بدني) وتابع مع طبيبك.",
    };
  if (sys >= 120 && sys <= 129 && dia < 80)
    return {
      label: "مرتفع بسيط",
      tone: "warning",
      advice: "راقب القراءات بانتظام وحافظ على نظام غذائي صحي.",
    };
  return {
    label: "طبيعي",
    tone: "success",
    advice: "قراءة ممتازة. استمر على نفس النمط الصحي.",
  };
}

type SugarState = "fasting" | "postmeal" | "random";
type SugarCategory = { label: string; tone: "success" | "warning" | "destructive"; advice: string };

function evaluateSugar(value: number, state: SugarState): SugarCategory {
  // mg/dL — ADA
  if (state === "fasting") {
    if (value < 100) return { label: "طبيعي", tone: "success", advice: "قراءة صيام طبيعية." };
    if (value <= 125)
      return { label: "ما قبل السكري", tone: "warning", advice: "راجع طبيبك لعمل فحوصات تكميلية." };
    return { label: "مرتفع — سكري محتمل", tone: "destructive", advice: "يلزم التوجه لطبيب باطنة/سكر." };
  }
  if (state === "postmeal") {
    if (value < 140) return { label: "طبيعي", tone: "success", advice: "قراءة بعد الأكل طبيعية." };
    if (value <= 199)
      return { label: "ما قبل السكري", tone: "warning", advice: "قلل السكريات وراجع طبيبك." };
    return { label: "مرتفع — سكري محتمل", tone: "destructive", advice: "استشر الطبيب فوراً." };
  }
  // random
  if (value < 140) return { label: "طبيعي", tone: "success", advice: "ضمن المعدل الطبيعي." };
  if (value <= 199) return { label: "مرتفع نسبياً", tone: "warning", advice: "أعد القياس صائماً وراجع طبيبك." };
  return { label: "مرتفع جداً", tone: "destructive", advice: "استشر الطبيب فوراً." };
}

const toneClasses: Record<string, string> = {
  success: "bg-success/15 text-success border-success/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  orange: "bg-[oklch(0.72_0.18_55)]/15 text-[oklch(0.82_0.18_55)] border-[oklch(0.72_0.18_55)]/40",
  destructive: "bg-destructive/15 text-destructive border-destructive/40",
  crisis: "bg-destructive text-destructive-foreground border-destructive animate-pulse",
};

type Reading =
  | { kind: "bp"; sys: number; dia: number; label: string; at: string }
  | { kind: "sugar"; value: number; state: SugarState; label: string; at: string };

const STORAGE_KEY = "sanad_health_readings_v1";
const LEGACY_STORAGE_KEY = "sandi_health_readings_v1";

function loadReadings(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, raw);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}
function saveReadings(list: Reading[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function HealthTracker() {
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [sugar, setSugar] = useState("");
  const [sugarState, setSugarState] = useState<SugarState>("fasting");
  const [readings, setReadings] = useState<Reading[]>([]);

  useEffect(() => {
    setReadings(loadReadings());
  }, []);

  const sysN = Number(sys);
  const diaN = Number(dia);
  const bpValid = sys && dia && sysN > 0 && diaN > 0;
  const bp = bpValid ? evaluateBP(sysN, diaN) : null;

  const sugarN = Number(sugar);
  const sugarValid = sugar && sugarN > 0;
  const sug = sugarValid ? evaluateSugar(sugarN, sugarState) : null;

  function saveBP() {
    if (!bp) return;
    const next: Reading[] = [
      { kind: "bp" as const, sys: sysN, dia: diaN, label: bp.label, at: new Date().toISOString() },
      ...readings,
    ].slice(0, 50);
    setReadings(next);
    saveReadings(next);
  }
  function saveSugar() {
    if (!sug) return;
    const next: Reading[] = [
      { kind: "sugar" as const, value: sugarN, state: sugarState, label: sug.label, at: new Date().toISOString() },
      ...readings,
    ].slice(0, 50);
    setReadings(next);
    saveReadings(next);
  }
  function removeAt(i: number) {
    const next = readings.filter((_, idx) => idx !== i);
    setReadings(next);
    saveReadings(next);
  }

  return (
    <AppShell
      title="حاسبة ومؤشرات الصحة"
      subtitle="ضغط الدم والسكر — نتائج استرشادية"
      backTo="/patient"
      tone="primary"
      right={
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
          <Activity className="h-5 w-5" />
        </div>
      }
    >
      {/* Blood pressure card */}
      <section className="-mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/15 text-destructive">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">قياس ضغط الدم</h2>
            <p className="text-xs text-muted-foreground">أدخل قراءة الانقباضي والانبساطي</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">الانقباضي (Systolic)</span>
            <input
              type="number"
              inputMode="numeric"
              value={sys}
              onChange={(e) => setSys(e.target.value)}
              placeholder="120"
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">الانبساطي (Diastolic)</span>
            <input
              type="number"
              inputMode="numeric"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              placeholder="80"
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
        </div>

        {bp && (
          <div className={`mt-4 rounded-2xl border p-4 ${toneClasses[bp.tone]}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">{bp.label}</p>
              <span className="text-xs font-bold opacity-90">
                {sysN}/{diaN}
              </span>
            </div>
            <p className="mt-1 text-xs opacity-90">{bp.advice}</p>
            {bp.tone === "crisis" && (
              <Link
                to="/patient/emergency"
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-destructive-foreground/10 px-3 py-2 text-xs font-extrabold"
              >
                <Siren className="h-4 w-4" /> اذهب لأقرب طوارئ الآن
              </Link>
            )}
            <button
              onClick={saveBP}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              <Save className="h-4 w-4" /> حفظ القراءة في ملفي الطبي
            </button>
          </div>
        )}

        <details className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs">
          <summary className="cursor-pointer font-bold">المعايير (AHA/ADA)</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>طبيعي: أقل من 120/80</li>
            <li>مرتفع بسيط: 120–129 والانبساطي أقل من 80</li>
            <li>مرحلة أولى: 130–139 أو 80–89</li>
            <li>مرحلة ثانية: 140+ أو 90+</li>
            <li>أزمة ضغط: أعلى من 180/120</li>
          </ul>
        </details>
      </section>

      {/* Blood sugar card */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Droplet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">قياس السكر في الدم</h2>
            <p className="text-xs text-muted-foreground">القيمة بالـ mg/dL</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              { id: "fasting", label: "صائم" },
              { id: "postmeal", label: "بعد الأكل بساعتين" },
              { id: "random", label: "عشوائي" },
            ] as { id: SugarState; label: string }[]
          ).map((o) => (
            <button
              key={o.id}
              onClick={() => setSugarState(o.id)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                sugarState === o.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold">القيمة (mg/dL)</span>
          <input
            type="number"
            inputMode="numeric"
            value={sugar}
            onChange={(e) => setSugar(e.target.value)}
            placeholder="مثال: 95"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        {sug && (
          <div className={`mt-4 rounded-2xl border p-4 ${toneClasses[sug.tone]}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">{sug.label}</p>
              <span className="text-xs font-bold opacity-90">{sugarN} mg/dL</span>
            </div>
            <p className="mt-1 text-xs opacity-90">{sug.advice}</p>
            <button
              onClick={saveSugar}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              <Save className="h-4 w-4" /> حفظ القراءة في ملفي الطبي
            </button>
          </div>
        )}

        <details className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs">
          <summary className="cursor-pointer font-bold">المعايير (ADA)</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>صائم: طبيعي أقل من 100 — ما قبل السكري 100–125 — سكري 126+</li>
            <li>بعد الأكل بساعتين: طبيعي أقل من 140 — ما قبل السكري 140–199 — سكري 200+</li>
            <li>عشوائي: مرتفع من 140، ومرتفع جداً من 200</li>
          </ul>
        </details>
      </section>

      {/* Saved log */}
      <section className="mt-5">
        <h3 className="mb-2 text-sm font-bold">ملفي الطبي — آخر القراءات</h3>
        {readings.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            لسه ما فيش قراءات محفوظة.
          </div>
        ) : (
          <ul className="space-y-2">
            {readings.map((r, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-xs"
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg ${
                    r.kind === "bp"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {r.kind === "bp" ? <Heart className="h-4 w-4" /> : <Droplet className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {r.kind === "bp"
                      ? `ضغط ${r.sys}/${r.dia} — ${r.label}`
                      : `سكر ${r.value} mg/dL (${
                          r.state === "fasting" ? "صائم" : r.state === "postmeal" ? "بعد الأكل" : "عشوائي"
                        }) — ${r.label}`}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(r.at).toLocaleString("ar-EG")}
                  </p>
                </div>
                <button
                  onClick={() => removeAt(i)}
                  aria-label="حذف"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 rounded-xl bg-secondary/50 p-3 text-center text-[11px] text-muted-foreground">
        النتائج استرشادية بناءً على المعايير الطبية المعتمدة ولا تغني عن الاستشارة الطبية.
      </p>
    </AppShell>
  );
}