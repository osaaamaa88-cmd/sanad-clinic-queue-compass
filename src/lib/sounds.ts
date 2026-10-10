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

let master: GainNode | null = null;
function out(a: AudioContext): AudioNode {
  if (!master) {
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = a.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(a.destination);
  }
  return master;
}

/** Soft bell/glass note: sine fundamental + quiet overtones, fast attack, smooth exponential decay. */
function bell(freq: number, start: number, dur: number, vol = 0.12) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const partials: [number, number][] = [
    [1, 1],
    [2, 0.28],
    [3.01, 0.08],
  ];
  for (const [mult, amp] of partials) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * mult, t);
    const d = dur / mult ** 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out(a));
    o.start(t);
    o.stop(t + d + 0.05);
  }
}

/** iOS-like keyboard "tock": very short filtered noise burst + low thump. */
function tock(vol = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const len = Math.floor(a.sampleRate * 0.025);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 4;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2400;
  bp.Q.value = 1.2;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(bp).connect(g).connect(out(a));
  src.start(t);
  const o = a.createOscillator();
  const og = a.createGain();
  o.frequency.setValueAtTime(320, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.03);
  og.gain.setValueAtTime(vol * 0.5, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(og).connect(out(a));
  o.start(t);
  o.stop(t + 0.05);
}

function haptic(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    // ignore
  }
}

export function playClick() {
  if (!isSoundOn()) return;
  tock(0.16);
  haptic(8);
}

/** Apple Pay–style confirmation: two bright glass notes. */
export function playSuccess() {
  if (!isSoundOn()) return;
  bell(1318.5, 0, 0.5, 0.11); // E6
  bell(1975.5, 0.11, 0.9, 0.1); // B6
  haptic([12, 60, 18]);
}

/** iOS "Note"-like notification: soft rising tri-tone. */
export function playNotification() {
  if (!isSoundOn()) return;
  bell(1046.5, 0, 0.6, 0.1); // C6
  bell(1318.5, 0.12, 0.6, 0.1); // E6
  bell(1568, 0.24, 1.1, 0.1); // G6
  haptic([20, 80, 20]);
}

let alarmTimer: ReturnType<typeof setInterval> | null = null;
const alarmListeners = new Set<(on: boolean) => void>();

/** Gentle iOS "Radar"-style looping alarm until stopAlarm() is called. */
export function startAlarm() {
  if (!isSoundOn() || alarmTimer) return;
  const ring = () => {
    const notes = [1568, 1318.5, 1568, 2093];
    notes.forEach((f, i) => bell(f, i * 0.16, 0.5, 0.16));
    haptic([200, 100, 200]);
  };
  ring();
  alarmTimer = setInterval(ring, 1400);
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
