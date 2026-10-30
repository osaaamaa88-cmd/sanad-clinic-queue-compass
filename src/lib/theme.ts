import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
const KEY = "sanad.theme.v1";
const LEGACY_KEY = "sandi.theme.v1";

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", mode === "light");
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const legacy = localStorage.getItem(LEGACY_KEY) as ThemeMode | null;
    const saved = (localStorage.getItem(KEY) as ThemeMode | null) ?? legacy ?? "dark";
    if (legacy && !localStorage.getItem(KEY)) localStorage.setItem(KEY, legacy);
    setMode(saved);
    applyTheme(saved);
  }, []);

  const toggle = () => {
    const next: ThemeMode = document.documentElement.classList.contains("light") ? "dark" : "light";
    localStorage.setItem(KEY, next);
    applyTheme(next);
    setMode(next);
  };

  return { mode, toggle };
}
