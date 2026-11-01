export type LabStatus = "normal" | "high" | "low" | "unknown";

function normalizeLabDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٫]/g, ".")
    .replace(/[٬]/g, ",")
    .replace(/[−﹣]/g, "-");
}

function parseLabNumber(value: string): number {
  const normalized = normalizeLabDigits(value).replace(/,/g, "");
  const numeric = normalized.match(/-?\d+(?:\.\d+)?/)?.[0];
  return numeric === undefined ? Number.NaN : Number(numeric);
}

/** Recompute status from the printed range so a model slip can't flip normal/high/low. */
export function checkStatus(value: string, range: string, given: LabStatus): LabStatus {
  const v = parseLabNumber(value);
  if (isNaN(v)) return given;
  const normalizedRange = normalizeLabDigits(range).replace(/,/g, "");
  const nums = (normalizedRange.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (/^\s*(<|≤|up to|less|حتى|أقل)/i.test(normalizedRange) && nums.length === 1)
    return v > nums[0] ? "high" : "normal";
  if (/^\s*(>|≥|more|أكثر|أكبر)/i.test(normalizedRange) && nums.length === 1)
    return v < nums[0] ? "low" : "normal";
  if (nums.length === 2 && nums[0] < nums[1])
    return v < nums[0] ? "low" : v > nums[1] ? "high" : "normal";
  return given;
}

/** Deterministic critical-value check — independent of the model. */
export function isCriticalLab(name: string, value: string, unit: string): boolean {
  let v = parseLabNumber(value);
  if (isNaN(v)) return false;
  const n = name.toLowerCase();
  const u = unit.toLowerCase();
  if (/potassium|\bk\+?\b|بوتاسيوم/.test(n)) return v < 2.8 || v > 6.0;
  if (/sodium|\bna\+?\b|صوديوم/.test(n)) return v < 125 || v > 155;
  if (/glucose|sugar|\bfbs\b|\brbs\b|سكر|جلوكوز/.test(n) && !/hba1c|a1c|تراكمي/.test(n)) {
    if (u.includes("mmol")) v *= 18;
    return v < 54 || v > 400;
  }
  if (/h(a)?emoglobin|\bhgb\b|\bhb\b|هيموجلوبين/.test(n) && !/a1c|glyc/.test(n)) {
    if (u.includes("g/l") && !u.includes("dl")) v /= 10;
    return v < 7;
  }
  if (/platelet|\bplt\b|صفائح/.test(n)) {
    if (v < 2000) v *= 1000;
    return v < 20000;
  }
  return false;
}
