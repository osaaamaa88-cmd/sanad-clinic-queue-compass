export type BPTone = "success" | "warning" | "orange" | "destructive" | "crisis";

export type BPCategory = {
  label: string;
  tone: BPTone;
  advice: string;
};

/** AHA thresholds: evaluates a blood-pressure reading into a display category. */
export function evaluateBP(sys: number, dia: number): BPCategory {
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

export type SugarState = "fasting" | "postmeal" | "random";
export type SugarCategory = {
  label: string;
  tone: "success" | "warning" | "destructive";
  advice: string;
};

/** ADA thresholds (mg/dL): evaluates a blood-sugar reading for the given state. */
export function evaluateSugar(value: number, state: SugarState): SugarCategory {
  // mg/dL — ADA
  if (state === "fasting") {
    if (value < 100) return { label: "طبيعي", tone: "success", advice: "قراءة صيام طبيعية." };
    if (value <= 125)
      return { label: "ما قبل السكري", tone: "warning", advice: "راجع طبيبك لعمل فحوصات تكميلية." };
    return {
      label: "مرتفع — سكري محتمل",
      tone: "destructive",
      advice: "يلزم التوجه لطبيب باطنة/سكر.",
    };
  }
  if (state === "postmeal") {
    if (value < 140) return { label: "طبيعي", tone: "success", advice: "قراءة بعد الأكل طبيعية." };
    if (value <= 199)
      return { label: "ما قبل السكري", tone: "warning", advice: "قلل السكريات وراجع طبيبك." };
    return { label: "مرتفع — سكري محتمل", tone: "destructive", advice: "استشر الطبيب فوراً." };
  }
  // random
  if (value < 140) return { label: "طبيعي", tone: "success", advice: "ضمن المعدل الطبيعي." };
  if (value <= 199)
    return { label: "مرتفع نسبياً", tone: "warning", advice: "أعد القياس صائماً وراجع طبيبك." };
  return { label: "مرتفع جداً", tone: "destructive", advice: "استشر الطبيب فوراً." };
}

export const toneClasses: Record<string, string> = {
  success: "bg-success/15 text-success border-success/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  orange: "bg-[oklch(0.72_0.18_55)]/15 text-[oklch(0.82_0.18_55)] border-[oklch(0.72_0.18_55)]/40",
  destructive: "bg-destructive/15 text-destructive border-destructive/40",
  crisis: "bg-destructive text-destructive-foreground border-destructive animate-pulse",
};
