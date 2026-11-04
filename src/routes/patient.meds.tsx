import { createFileRoute } from "@tanstack/react-router";
import { startAlarm } from "@/lib/sounds";
import { syncNativeMedReminders } from "@/lib/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pill, Plus, Trash2, Bell, BellOff, Clock, Check, ScanLine } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/patient/meds")({
  staticData: { sitemap: true },
  validateSearch: (search: Record<string, unknown>): { rx?: string } => ({
    rx: typeof search.rx === "string" ? search.rx : undefined,
  }),
  head: () => ({
    meta: [
      { title: "سند — تذكير مواعيد الأدوية" },
      { name: "description", content: "أضف أدويتك وجرعاتها ومواعيدها ليذكرك التطبيق بها." },
    ],
  }),
  component: Meds,
});

type Med = {
  id: string;
  name: string;
  dose: string;
  times: string[]; // "HH:MM"
  notes?: string;
  createdAt: string;
};

// Adherence log: "YYYY-MM-DD|HH:MM|medId" -> true. Kept small (last 30 days).
const TAKEN_KEY = "sanad_meds_taken_v1";

function loadTaken(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(TAKEN_KEY) || "{}") as Record<string, boolean>;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return Object.fromEntries(
      Object.entries(raw).filter(([key]) => {
        const datePart = key.split("|")[0];
        const ts = datePart ? new Date(datePart).getTime() : 0;
        return ts >= cutoff;
      }),
    );
  } catch {
    return {};
  }
}

function takenKey(medId: string, time: string, now = new Date()): string {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  return `${day}|${time}|${medId}`;
}

const KEY = "sanad_meds_v1";
const LEGACY_KEY = "sandi_meds_v1";

function load(): Med[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw && !localStorage.getItem(KEY)) localStorage.setItem(KEY, raw);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}
function save(list: Med[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function Meds() {
  const [meds, setMeds] = useState<Med[]>([]);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [timesInput, setTimesInput] = useState<string[]>(["08:00"]);
  const [notes, setNotes] = useState("");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");
  const firedRef = useRef<Set<string>>(new Set());
  const [taken, setTaken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setTaken(loadTaken());
    setMeds(load());
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPerm(Notification.permission);
    } else {
      setNotifPerm("unsupported");
    }
  }, []);

  // استقبال روشتة من QR الطبيب: ?rx=<encoded>
  const rxParam = Route.useSearch()?.rx;
  const rxImportedRef = useRef(false);
  useEffect(() => {
    if (!rxParam || rxImportedRef.current) return;
    rxImportedRef.current = true;
    try {
      const parsed = JSON.parse(decodeURIComponent(rxParam)) as {
        t?: string;
        rx?: {
          patient?: string;
          items?: { name?: string; dose?: string }[];
          doctor?: string;
        };
      };
      const rx = parsed?.rx;
      if (parsed?.t !== "sanad-rx" || !Array.isArray(rx?.items)) throw new Error("bad payload");
      const incoming: Med[] = rx.items
        .filter((i) => typeof i?.name === "string" && i.name.trim())
        .slice(0, 10)
        .map((i) => ({
          id: crypto.randomUUID(),
          name: String(i.name).trim().slice(0, 80),
          dose: String(i.dose ?? "")
            .trim()
            .slice(0, 60),
          times: ["08:00"],
          notes: rx.doctor ? `روشتة ${rx.doctor}` : "من روشتة إلكترونية",
          createdAt: new Date().toISOString(),
        }));
      if (!incoming.length) throw new Error("empty");
      const next = [...incoming, ...load()];
      setMeds(next);
      save(next);
      toast.success(
        `اتضافت ${incoming.length} دواء من روشتة ${rx.doctor ?? "الطبيب"} — اضبط المواعيد المناسبة`,
      );
    } catch {
      toast.error("كود الروشتة مش صالح — اطلب من الطبيب كود جديد");
    }
  }, [rxParam]);

  function markTaken(medId: string, time: string) {
    const key = takenKey(medId, time);
    const next = { ...taken, [key]: true };
    setTaken(next);
    try {
      localStorage.setItem(TAKEN_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable */
    }
  }

  useEffect(() => {
    void syncNativeMedReminders(meds);
  }, [meds]);

  // Reminder loop — checks every 30s, fires within 1 min of scheduled time.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const key = `${now.toDateString()}-${hh}:${mm}`;
      meds.forEach((m) => {
        m.times.forEach((t) => {
          if (t === `${hh}:${mm}`) {
            const fireKey = `${m.id}-${key}`;
            if (firedRef.current.has(fireKey)) return;
            firedRef.current.add(fireKey);
            const title = `تذكير دواء: ${m.name}`;
            const body = `الجرعة: ${m.dose || "-"}`;
            startAlarm();
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification(title, { body });
              } catch {
                /* ignore */
              }
            } else {
              // Fallback in-app alert
              console.info("[سند]", title, body);
            }
          }
        });
      });
    }, 30_000);
    return () => clearInterval(timer);
  }, [meds]);

  async function requestPerm() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  }

  function addMed(e: React.FormEvent) {
    e.preventDefault();
    const cleanTimes = timesInput.filter((t) => /^\d{2}:\d{2}$/.test(t));
    if (!name.trim() || cleanTimes.length === 0) return;
    const next: Med[] = [
      {
        id: crypto.randomUUID(),
        name: name.trim().slice(0, 80),
        dose: dose.trim().slice(0, 60),
        times: cleanTimes,
        notes: notes.trim().slice(0, 200) || undefined,
        createdAt: new Date().toISOString(),
      },
      ...meds,
    ];
    setMeds(next);
    save(next);
    setName("");
    setDose("");
    setTimesInput(["08:00"]);
    setNotes("");
  }

  function remove(id: string) {
    const next = meds.filter((m) => m.id !== id);
    setMeds(next);
    save(next);
  }

  const nextDose = useMemo(() => {
    if (meds.length === 0) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let best: { med: Med; t: string; diff: number } | null = null as {
      med: Med;
      t: string;
      diff: number;
    } | null;
    meds.forEach((m) =>
      m.times.forEach((t) => {
        const [h, mi] = t.split(":").map(Number);
        let diff = h * 60 + mi - nowMin;
        if (diff < 0) diff += 24 * 60;
        if (!best || diff < best.diff) best = { med: m, t, diff };
      }),
    );
    return best;
  }, [meds]);

  return (
    <AppShell
      title="تذكير مواعيد الأدوية"
      subtitle="أضف أدويتك وسنذكّرك في مواعيدها"
      backTo="/patient"
      tone="primary"
      right={
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
          <Pill className="h-5 w-5" />
        </div>
      }
    >
      {/* Notification permission */}
      <div className="-mt-8 rounded-3xl tile-3d border border-border bg-card p-4 shadow-soft">
        {notifPerm === "granted" ? (
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/20 text-success">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">التنبيهات مفعّلة</p>
              <p className="text-xs text-muted-foreground">هيوصلك تنبيه في ميعاد كل جرعة.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/20 text-warning">
              <BellOff className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">فعّل التنبيهات</p>
              <p className="text-xs text-muted-foreground">
                {notifPerm === "unsupported"
                  ? "المتصفح ما بيدعمش التنبيهات — التذكير هيظهر داخل التطبيق فقط."
                  : "اسمح للمتصفح بإرسال التنبيهات علشان توصلك في ميعادها."}
              </p>
            </div>
            {notifPerm !== "unsupported" && (
              <button
                onClick={requestPerm}
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
              >
                تفعيل
              </button>
            )}
          </div>
        )}
      </div>

      {/* استقبال روشتة QR — يظهر معلومة للمريض */}
      <div className="mt-4 flex items-center gap-3 rounded-3xl tile-3d border border-primary/30 bg-primary/5 p-3">
        <ScanLine className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground">
          عندك رمز QR من طبيبك؟ امسحه بكاميرا الهاتف وافتح الرابط — الأدوية هتتضاف هنا تلقائياً.
        </p>
      </div>

      {/* Next dose */}
      {nextDose && (
        <div className="mt-4 flex items-center gap-3 rounded-3xl tile-3d border border-primary/30 bg-primary-soft/40 p-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">الجرعة القادمة</p>
            <p className="truncate font-extrabold">{nextDose.med.name}</p>
            <p className="text-xs text-muted-foreground">
              الساعة {nextDose.t} • {nextDose.med.dose || "بدون جرعة محددة"}
            </p>
          </div>
        </div>
      )}

      {/* Add form */}
      <form
        onSubmit={addMed}
        className="mt-5 rounded-3xl tile-3d border border-border bg-card p-4 shadow-soft"
      >
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> إضافة دواء جديد
        </h2>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold">اسم الدواء</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
            placeholder="مثال: Panadol"
            className="w-full rounded-3xl tile-3d border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold">الجرعة</span>
          <input
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            maxLength={60}
            placeholder="مثال: قرص بعد الأكل"
            className="w-full rounded-3xl tile-3d border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold">مواعيد الجرعات</span>
          <div className="space-y-2">
            {timesInput.map((t, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="time"
                  value={t}
                  onChange={(e) => {
                    const next = [...timesInput];
                    next[idx] = e.target.value;
                    setTimesInput(next);
                  }}
                  className="flex-1 rounded-3xl tile-3d border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {timesInput.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTimesInput(timesInput.filter((_, i) => i !== idx))}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-muted-foreground"
                    aria-label="حذف الميعاد"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTimesInput([...timesInput, "12:00"])}
            className="mt-2 flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold"
          >
            <Plus className="h-3 w-3" /> إضافة ميعاد آخر
          </button>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold">ملاحظات (اختياري)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="مثال: بعد الفطار مباشرة"
            className="w-full rounded-3xl tile-3d border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <button
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-extrabold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> حفظ الدواء
        </button>
      </form>

      {/* List */}
      <section className="mt-5">
        <h3 className="mb-2 text-sm font-bold">أدويتي ({meds.length})</h3>
        {meds.length === 0 ? (
          <div className="rounded-3xl tile-3d border-2 border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
            لسه ما أضفتش أدوية.
          </div>
        ) : (
          <ul className="space-y-2">
            {meds.map((m) => (
              <li key={m.id} className="rounded-3xl tile-3d border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{m.name}</p>
                    {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.times.map((t) => {
                        const key = takenKey(m.id, t);
                        const did = !!taken[key];
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => !did && markTaken(m.id, t)}
                            aria-pressed={did}
                            aria-label={
                              did
                                ? `تم أخذ جرعة ${m.name} الساعة ${t}`
                                : `سجّل أخذ جرعة ${m.name} الساعة ${t}`
                            }
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                              did
                                ? "bg-success/20 text-success"
                                : "bg-secondary hover:bg-secondary/70"
                            }`}
                          >
                            {did && <Check className="h-3 w-3" />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                    {m.notes && <p className="mt-1 text-xs text-muted-foreground">{m.notes}</p>}
                  </div>
                  <button
                    onClick={() => remove(m.id)}
                    aria-label="حذف الدواء"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
        التذكيرات تعتمد على إبقاء التطبيق مفتوحاً في المتصفح.
      </p>
    </AppShell>
  );
}
