export const VOICE_KEY = "voice_accessibility_enabled";

export function isVoiceModeOn() {
  try {
    return localStorage.getItem(VOICE_KEY) === "true";
  } catch {
    return false;
  }
}

const DISCLAIMER_SEEN_KEY = "voice_disclaimer_seen";

export function setVoiceMode(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? "true" : "false");
    window.dispatchEvent(new Event("sanad:voice-mode"));
    if (on && localStorage.getItem(DISCLAIMER_SEEN_KEY) !== "true") {
      localStorage.setItem(DISCLAIMER_SEEN_KEY, "true");
      void Promise.all([import("sonner"), import("@/components/MedicalDisclaimer")]).then(
        ([{ toast }, { VOICE_DISCLAIMER }]) =>
          toast.warning(VOICE_DISCLAIMER, { duration: 10000, closeButton: true }),
      );
    }
  } catch {
    // Ignore disclaimer storage failures; TTS still works without it.
  }
}

// --- Senior-friendly mode ---
export const SENIOR_KEY = "sanad_senior_mode";

export function isSeniorModeOn(): boolean {
  try {
    return localStorage.getItem(SENIOR_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSeniorMode(on: boolean) {
  try {
    localStorage.setItem(SENIOR_KEY, on ? "true" : "false");
    window.dispatchEvent(new Event("sanad:senior-mode"));
  } catch {
    // Storage may be unavailable.
  }
}

// Priority list for warm, high-quality female Arabic voices across iOS, Android, and Web.
const PREFERRED_FEMALE_NAMES = [
  "laila",
  "zeina",
  "salma",
  "maryam",
  "google",
  "female",
  "ar-eg",
  "ar-sa",
  "siri",
];
// Known male Arabic system voices to avoid.
const MALE_VOICE_PATTERN = /maged|majed|tarik|tariq|hamed|naayf|arabic male|\bmale\b|ذكر/i;
export const FEMALE_PITCH = 1.1;

/** Strip markdown/emojis/symbols and add breathing pauses so TTS reads clearly. */
export function cleanForSpeech(text: string) {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`~>|[]{}()<>"“”]/g, " ")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "")
    .replace(/^\s*[-•\d]+[.)-]?\s+/gm, "")
    .replace(/\s*\n+\s*/g, "، ")
    .replace(/([.!؟?])\s*/g, "$1، ")
    .replace(/[،,]\s*[،,]+/g, "،")
    .replace(/\s{2,}/g, " ")
    .replace(/^[،\s]+|[،\s]+$/g, "")
    .trim();
}
export const FEMALE_RATE = 0.85;

let cachedVoices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return cachedVoices;
  const v = window.speechSynthesis.getVoices();
  if (v.length) cachedVoices = v;
  return cachedVoices;
}
// Immediate pre-fetch + refresh when the async voice list arrives.
if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

export function getBestFemaleArabicVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = loadVoices();
  const arabic = voices.filter(
    (v) => v.lang.toLowerCase().startsWith("ar") && !MALE_VOICE_PATTERN.test(v.name),
  );
  // Prefer modern natural/neural voices, Egyptian first.
  const natural = arabic.filter((v) => /natural|neural|online|google|premium|enhanced/i.test(v.name));
  const egNatural = natural.find((v) => v.lang.toLowerCase() === "ar-eg");
  if (egNatural) return egNatural;
  if (natural[0]) return natural[0];
  for (const key of PREFERRED_FEMALE_NAMES) {
    const found = arabic.find((v) => `${v.name} ${v.lang}`.toLowerCase().includes(key));
    if (found) return found;
  }
  return arabic.find((v) => v.lang.toLowerCase() === "ar-eg") ?? arabic[0] ?? null;
}

/** Apply the warm female voice settings to any utterance. */
export function applyFemaleVoice(u: SpeechSynthesisUtterance) {
  const v = getBestFemaleArabicVoice();
  u.lang = v?.lang ?? "ar-EG";
  if (v) u.voice = v;
  u.pitch = FEMALE_PITCH;
  u.rate = FEMALE_RATE;
}

/** Apply Nemo's calm, unhurried Arabic speaking style. */
export function applyBaymaxVoice(u: SpeechSynthesisUtterance) {
  applyFemaleVoice(u);
  u.pitch = 0.96;
  u.rate = isSeniorModeOn() ? 0.74 : 0.84;
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
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    applyFemaleVoice(u);
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
  const C =
    (
      window as unknown as {
        SpeechRecognition?: new () => Rec;
        webkitSpeechRecognition?: new () => Rec;
      }
    ).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = "ar-EG";
  r.interimResults = false;
  r.continuous = false;
  return r;
}
