import { useEffect, useState } from "react";

export type ThemeMode = "dark" | "light";
const KEY = "sanad.theme.v1";
const LEGACY_KEY = "sandi.theme.v1";

export function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", mode === "light");

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", mode === "light" ? "#F8FAF9" : "#0F172A");

  void import("./native").then(({ setupStatusBar }) => setupStatusBar(mode));
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

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Runs a theme toggle with a circular reveal expanding from the tap point. */
export function circularReveal(e: { clientX: number; clientY: number }, run: () => void) {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return run();
  const x = e.clientX || window.innerWidth / 2;
  const y = e.clientY || window.innerHeight / 2;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const t = doc.startViewTransition(run);
  void t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 550, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}
