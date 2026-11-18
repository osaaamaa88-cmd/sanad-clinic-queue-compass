import { READINGS_KEY } from "@/lib/organ-insights";
import type { SugarState } from "@/lib/vitals-evaluation";

export type Reading =
  | { kind: "bp"; sys: number; dia: number; label: string; at: string }
  | { kind: "sugar"; value: number; state: SugarState; label: string; at: string };

const LEGACY_STORAGE_KEY = "sandi_health_readings_v1";

/** Reads the saved readings from localStorage (migrating the legacy key once). */
export function loadReadings(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READINGS_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw && !localStorage.getItem(READINGS_KEY)) localStorage.setItem(READINGS_KEY, raw);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

export function saveReadings(list: Reading[]) {
  localStorage.setItem(READINGS_KEY, JSON.stringify(list));
}
