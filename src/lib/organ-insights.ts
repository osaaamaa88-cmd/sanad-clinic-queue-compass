export type OrganId = "head" | "heart" | "lungs" | "liver" | "pancreas" | "stomach";
export type OrganStatus = "normal" | "watch" | "alert" | "unknown";

export interface HealthSnapshot {
  bp?: { sys: number; dia: number; at: string };
  sugar?: { value: number; at: string };
}

export const NEMO_PREFILL_KEY = "sanad_nemo_prefill";
export const READINGS_KEY = "sanad_health_readings_v1";

export function parseReadings(raw: string | null): HealthSnapshot {
  const snap: HealthSnapshot = {};
  if (!raw) return snap;
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return snap;
    for (const r of list) {
      if (r?.kind === "bp" && Number(r.sys) && Number(r.dia)) {
        if (!snap.bp || r.at > snap.bp.at) snap.bp = { sys: Number(r.sys), dia: Number(r.dia), at: r.at };
      } else if (r?.kind === "sugar" && Number(r.value)) {
        if (!snap.sugar || r.at > snap.sugar.at) snap.sugar = { value: Number(r.value), at: r.at };
      }
    }
  } catch {
    /* ignore */
  }
  return snap;
}

export function bpStatus(bp?: HealthSnapshot["bp"]): OrganStatus {
  if (!bp) return "unknown";
  if (bp.sys >= 140 || bp.dia >= 90 || bp.sys < 90) return "alert";
  if (bp.sys >= 130 || bp.dia >= 85) return "watch";
  return "normal";
}

export function sugarStatus(s?: HealthSnapshot["sugar"]): OrganStatus {
  if (!s) return "unknown";
  if (s.value >= 200 || s.value < 70) return "alert";
  if (s.value >= 140) return "watch";
  return "normal";
}

export interface OrganAction {
  label: string;
  /** Message pre-filled into Nemo, or a local action */
  nemo?: string;
  measure?: "bp" | "sugar";
}

export interface OrganInfo {
  id: OrganId;
  name: string;
  /** hotspot position on the figure, percent */
  x: number;
  y: number;
  status: OrganStatus;
  reading: string;
  actions: OrganAction[];
}

export function buildOrgans(snap: HealthSnapshot): OrganInfo[] {
  const bp = bpStatus(snap.bp);
  const sg = sugarStatus(snap.sugar);
  const bpText = snap.bp ? `ضغط ${snap.bp.sys}/${snap.bp.dia}` : "لم يُسجل ضغط بعد";
  const sgText = snap.sugar ? `سكر ${snap.sugar.value} mg/dL` : "لم يُسجل سكر بعد";
  return [
    {
      id: "head", name: "الرأس والمخ", x: 50, y: 6, status: bp, reading: bpText,
      actions: [
        { label: "عندي صداع أو دوخة", nemo: "عندي صداع ودوخة، ممكن تساعدني أفهم السبب؟" },
        { label: "تمرين تهدئة وتنفس", nemo: "أنا متوتر ومحتاج تمرين تنفس يهديني" },
        { label: "مشاكل في النوم", nemo: "مش عارف أنام كويس، إيه اللي ممكن يساعدني؟" },
      ],
    },
    {
      id: "heart", name: "القلب والضغط", x: 54, y: 24, status: bp, reading: bpText,
      actions: [
        { label: "سجّل قياس ضغط", measure: "bp" },
        { label: "خفقان أو ألم صدر", nemo: "حاسس بخفقان في قلبي وضيق خفيف في صدري" },
        { label: "اسأل نيمو عن ضغطي", nemo: snap.bp ? `آخر قياس ضغط ليا ${snap.bp.sys}/${snap.bp.dia}، ده طبيعي؟` : "إزاي أعرف إن ضغطي طبيعي؟" },
      ],
    },
    {
      id: "lungs", name: "الرئتين والتنفس", x: 42, y: 25, status: "unknown", reading: "التنفس والكحة",
      actions: [
        { label: "كحة أو ضيق تنفس", nemo: "عندي كحة وضيق في التنفس" },
        { label: "حساسية صدر", nemo: "عندي حساسية صدر بتتعبني، أعمل إيه؟" },
      ],
    },
    {
      id: "liver", name: "الكبد", x: 42, y: 36, status: sg === "alert" ? "watch" : sg, reading: sgText,
      actions: [
        { label: "سجّل قياس سكر", measure: "sugar" },
        { label: "اسأل عن صحة الكبد", nemo: "إزاي أحافظ على صحة الكبد وإيه علامات التعب فيه؟" },
      ],
    },
    {
      id: "pancreas", name: "البنكرياس والسكر", x: 55, y: 39, status: sg, reading: sgText,
      actions: [
        { label: "سجّل قياس سكر", measure: "sugar" },
        { label: "اسأل نيمو عن السكر", nemo: snap.sugar ? `آخر قياس سكر ليا ${snap.sugar.value}، ده طبيعي؟` : "إيه المعدل الطبيعي للسكر في الدم؟" },
      ],
    },
    {
      id: "stomach", name: "المعدة والهضم", x: 50, y: 44, status: "unknown", reading: "الهضم والمعدة",
      actions: [
        { label: "ألم أو حموضة", nemo: "عندي ألم في معدتي وحموضة" },
        { label: "نصائح أكل صحي", nemo: "عايز نصائح أكل صحي يريح المعدة" },
      ],
    },
  ];
}

/** 0-100 score from available readings; null when nothing is recorded */
export function healthScore(snap: HealthSnapshot): number | null {
  const parts = [bpStatus(snap.bp), sugarStatus(snap.sugar)].filter((s) => s !== "unknown");
  if (!parts.length) return null;
  const pts = { normal: 100, watch: 70, alert: 40, unknown: 0 } as const;
  return Math.round(parts.reduce((a, s) => a + pts[s], 0) / parts.length);
}
