import { useEffect, useState } from "react";
import { DEFAULT_PREFS, PREFS_EVENT, readPrefs, setPref, type AppPrefs } from "@/lib/app-prefs";

/** Reactive device preferences; reads after hydration to avoid mismatches. */
export function usePrefs(): [AppPrefs, <K extends keyof AppPrefs>(k: K, v: AppPrefs[K]) => void] {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    return () => window.removeEventListener(PREFS_EVENT, sync);
  }, []);
  return [prefs, (k, v) => setPrefs(setPref(k, v))];
}
