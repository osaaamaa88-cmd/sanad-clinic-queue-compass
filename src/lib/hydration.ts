const HYDRATION_KEY = "sanad.patient.hydration";

export function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getTodayHydration() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(HYDRATION_KEY);
    if (!raw) return 0;
    const saved = JSON.parse(raw) as { day?: string; count?: number };
    const count = typeof saved.count === "number" && Number.isFinite(saved.count) ? saved.count : 0;
    return saved.day === todayKey() ? Math.max(0, Math.min(8, count)) : 0;
  } catch (error) {
    console.error("[PatientHome] Failed to read hydration progress:", error);
    return 0;
  }
}

export function saveTodayHydration(count: number) {
  try {
    window.localStorage.setItem(HYDRATION_KEY, JSON.stringify({ day: todayKey(), count }));
  } catch (error) {
    console.error("[PatientHome] Failed to save hydration progress:", error);
  }
}
