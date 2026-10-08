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

// Priority list for warm, high-quality female Arabic voices across iOS, Android, and Web.
const PREFERRED_FEMALE_NAMES = ["Laila", "Zeina", "Salma", "Maryam", "Google", "Female"];
// Known male Arabic system voices to avoid when falling back.
const MALE_VOICE_PATTERN = /tarik|tariq|majed|maged|hamed|naayf|male|ذكر/i;

export function getBestFemaleArabicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const arabicVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("ar"));
  for (const name of PREFERRED_FEMALE_NAMES) {
    const found = arabicVoices.find((v) => v.name.toLowerCase().includes(name.toLowerCase()));
    if (found) return found;
  }
  // Avoid known male voices when falling back.
  return arabicVoices.find((v) => !MALE_VOICE_PATTERN.test(v.name)) ?? arabicVoices[0] ?? null;
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
    const v = getBestFemaleArabicVoice();
    u.lang = v?.lang ?? "ar-EG";
    if (v) u.voice = v;
    u.pitch = 1.1;
    u.rate = 0.88;
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
