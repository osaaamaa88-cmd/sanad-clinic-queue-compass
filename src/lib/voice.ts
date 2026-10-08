export const VOICE_KEY = "voice_accessibility_enabled";

export function isVoiceModeOn() {
  try {
    return localStorage.getItem(VOICE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setVoiceMode(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? "true" : "false");
    window.dispatchEvent(new Event("sanad:voice-mode"));
  } catch {}
}

export function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ar-EG";
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang === "ar-EG") ?? voices.find((x) => x.lang.startsWith("ar"));
  if (v) u.voice = v;
  u.rate = 0.95;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export function createRecognizer(): Rec | null {
  if (typeof window === "undefined") return null;
  const C = (window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec })
    .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = "ar-EG";
  r.interimResults = false;
  r.continuous = false;
  return r;
}
