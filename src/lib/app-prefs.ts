/** Device-level user preferences shared by patient, doctor and reception screens. */
export type AppPrefs = {
  medReminders: boolean;
  queueAlerts: boolean;
  anonymousDefault: boolean;
  newPatientChime: boolean;
  receptionVoiceCall: boolean;
};

export const DEFAULT_PREFS: AppPrefs = {
  medReminders: true,
  queueAlerts: true,
  anonymousDefault: false,
  newPatientChime: true,
  receptionVoiceCall: false,
};

const KEY = "sanad_prefs";
export const PREFS_EVENT = "sanad:prefs";

export function readPrefs(): AppPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULT_PREFS, ...(raw && typeof raw === "object" ? raw : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setPref<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]): AppPrefs {
  const next = { ...readPrefs(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PREFS_EVENT));
  } catch {
    /* ignore */
  }
  return next;
}
