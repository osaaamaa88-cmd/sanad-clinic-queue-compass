/**
 * App-wide UI sounds synthesized with the Web Audio API — no files, no cost, works offline.
 * Mute preference persists in localStorage.
 */
import { useEffect, useState } from "react";

const KEY = "sanad.sound.enabled";
const listeners = new Set<(on: boolean) => void>();
let ctx: AudioContext | null = null;

export function isSoundOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) !== "0";
}

export function setSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
  if (!on) stopAlarm();
  listeners.forEach((l) => l(on));
  if (on) playSuccess();
}

export function useSoundOn() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(isSoundOn());
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return [on, setSoundOn] as const;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, vol = 0.15, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playClick() {
  if (!isSoundOn()) return;
  tone(1200, 0, 0.05, 0.06, "triangle");
}

export function playSuccess() {
  if (!isSoundOn()) return;
  tone(660, 0, 0.12, 0.12);
  tone(880, 0.1, 0.12, 0.12);
  tone(1320, 0.2, 0.22, 0.1);
}

export function playNotification() {
  if (!isSoundOn()) return;
  tone(988, 0, 0.18, 0.14);
  tone(1319, 0.15, 0.3, 0.12);
}

let alarmTimer: ReturnType<typeof setInterval> | null = null;
const alarmListeners = new Set<(on: boolean) => void>();

/** Looping alarm that keeps ringing until stopAlarm() is called. */
export function startAlarm() {
  if (!isSoundOn() || alarmTimer) return;
  const ring = () => {
    for (let i = 0; i < 4; i++) tone(i % 2 ? 1046 : 880, i * 0.18, 0.15, 0.2, "square");
  };
  ring();
  alarmTimer = setInterval(ring, 1200);
  alarmListeners.forEach((l) => l(true));
}

export function stopAlarm() {
  if (alarmTimer) clearInterval(alarmTimer);
  alarmTimer = null;
  alarmListeners.forEach((l) => l(false));
}

export function useAlarmActive() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(alarmTimer !== null);
    alarmListeners.add(setOn);
    return () => {
      alarmListeners.delete(setOn);
    };
  }, []);
  return on;
}

let installed = false;
/** Global tap sound on buttons/links + success sound on success toasts. */
export function installGlobalSounds(toast: { success: (...a: never[]) => unknown }) {
  if (installed || typeof window === "undefined") return;
  installed = true;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest("button, a, [role=button]");
      if (el && !(el as HTMLButtonElement).disabled) playClick();
    },
    { capture: true, passive: true },
  );
  const orig = toast.success.bind(toast);
  (toast as { success: (...a: unknown[]) => unknown }).success = (...a: unknown[]) => {
    playSuccess();
    return (orig as (...x: unknown[]) => unknown)(...a);
  };
}
