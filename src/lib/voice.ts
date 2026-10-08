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

export function speak(text: string, onEnd?: (success: boolean) => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.(false);
    return () => {};
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let cancelled = false;
  let launched = false;
  let finished = false;
  const complete = (success: boolean) => {
    if (cancelled || finished) return;
    finished = true;
    onEnd?.(success);
  };
  const launch = () => {
    if (cancelled || launched) return;
    launched = true;
    synth.removeEventListener("voiceschanged", launch);
    window.clearTimeout(timer);
    const u = new SpeechSynthesisUtterance(text);
    const arabic = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ar"));
    // Tariq/Tarik are male voices; generic Google voices do not guarantee gender.
    const female = /laila|layla|salma|hoda|mona|zeina|amira|female|أنثى/i;
    const v = arabic.find((v) => v.lang === "ar-EG" && female.test(v.name))
      ?? arabic.find((v) => female.test(v.name))
      ?? arabic.find((v) => v.lang === "ar-EG") ?? arabic[0];
    u.lang = v?.lang ?? "ar-EG";
    if (v) u.voice = v;
    u.pitch = 1.0;
    u.rate = 0.9;
    u.onend = () => complete(true);
    u.onerror = () => complete(false);
    synth.speak(u);
  };
  const timer = window.setTimeout(launch, 500);
  if (synth.getVoices().length) launch();
  else synth.addEventListener("voiceschanged", launch);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    synth.removeEventListener("voiceschanged", launch);
    synth.cancel();
  };
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
  abort?: () => void;
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
