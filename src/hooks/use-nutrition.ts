import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getFollowerKey } from "@/lib/clinic-profile";
import { imageToBase64 } from "@/lib/image-to-base64";
import { calcTarget, type Profile } from "@/lib/nutrition-calc";
import {
  analyzeFood,
  suggestEgyptianAlternatives,
  type Alternative,
  type FoodAnalysis,
} from "@/lib/nutrition.functions";

export type Meal = "فطور" | "غداء" | "عشاء" | "سناك";
export type Entry = FoodAnalysis & { id: string; meal: Meal; at: string };

const LOG_KEY = "sanad_nutrition_log_v1";
const PROFILE_KEY = "sanad_nutrition_profile_v1";
const today = () => new Date().toDateString();

/** Nutrition log + profile state, food analysis and alternatives. */
export function useNutrition() {
  const [log, setLog] = useState<Entry[]>([]);
  const [profile, setProfile] = useState<Profile>({
    sex: "m",
    age: 30,
    height: 170,
    weight: 75,
    activity: 1.375,
    goal: "keep",
  });
  const [meal, setMeal] = useState<Meal>("غداء");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [altQ, setAltQ] = useState("");
  const [altBusy, setAltBusy] = useState(false);
  const [alts, setAlts] = useState<Alternative[]>([]);

  useEffect(() => {
    try {
      setLog(JSON.parse(localStorage.getItem(LOG_KEY) || "[]"));
      const p = localStorage.getItem(PROFILE_KEY);
      if (p) setProfile(JSON.parse(p));
    } catch {
      /* ignore */
    }
  }, []);

  const saveLog = (l: Entry[]) => {
    setLog(l);
    localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(0, 300)));
  };
  const updProfile = (p: Partial<Profile>) => {
    const n = { ...profile, ...p };
    setProfile(n);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(n));
  };
  const removeEntry = (id: string) => saveLog(log.filter((x) => x.id !== id));

  const target = calcTarget(profile);
  const todays = log.filter((e) => new Date(e.at).toDateString() === today());
  const eaten = todays.reduce((s, e) => s + e.calories, 0);
  const macros = todays.reduce(
    (s, e) => ({ p: s.p + e.protein, c: s.c + e.carbs, f: s.f + e.fat }),
    { p: 0, c: 0, f: 0 },
  );

  async function run(input: { image?: string; mime?: string; text?: string }) {
    setBusy(true);
    setResult(null);
    try {
      setResult(await analyzeFood({ data: { ...input, sessionKey: getFollowerKey() } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حصلت مشكلة");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeImage(f?: File) {
    if (!f) return;
    const { data, mime, preview: p } = await imageToBase64(f, 1024);
    setPreview(p);
    await run({ image: data, mime });
  }

  function analyzeText(t: string) {
    if (!t.trim()) return;
    setPreview(null);
    void run({ text: t });
  }

  async function askAlts(q: string) {
    if (!q.trim() || altBusy) return;
    setAltQ(q);
    setAltBusy(true);
    setAlts([]);
    try {
      const r = await suggestEgyptianAlternatives({
        data: {
          query: q,
          goal: profile.goal,
          target,
          eaten,
          recent: log.slice(0, 15).map((e) => e.name),
          sessionKey: getFollowerKey(),
        },
      });
      if (r.error) toast.error(r.error);
      else setAlts(r.alternatives);
    } catch {
      toast.error("تعذر اقتراح بدائل دلوقتي");
    } finally {
      setAltBusy(false);
    }
  }

  function addAlt(a: Alternative) {
    saveLog([
      {
        name: a.name,
        calories: a.calories,
        protein: a.protein,
        carbs: a.carbs,
        fat: a.fat,
        fiber: 0,
        items: [],
        advice: a.tip,
        id: crypto.randomUUID(),
        meal,
        at: new Date().toISOString(),
      },
      ...log,
    ]);
    toast.success(`اتضافت لـ${meal}`);
  }

  function addResult() {
    if (!result) return;
    saveLog([{ ...result, id: crypto.randomUUID(), meal, at: new Date().toISOString() }, ...log]);
    setResult(null);
    setPreview(null);
    setText("");
    toast.success("اتضافت للوجبات");
  }

  return {
    log,
    profile,
    updProfile,
    removeEntry,
    meal,
    setMeal,
    text,
    setText,
    busy,
    preview,
    result,
    altQ,
    setAltQ,
    altBusy,
    alts,
    target,
    todays,
    eaten,
    macros,
    analyzeImage,
    analyzeText,
    askAlts,
    addAlt,
    addResult,
  };
}
