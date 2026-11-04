import { Capacitor } from "@capacitor/core";

export const VOICE_KEY = "voice_accessibility_enabled";
const VOICE_SESSION_KEY = "sanad.voice.session";
const VOICE_MUTED_KEY = "sanad:voice-muted";

export function getVoiceSessionKey(): string {
  if (typeof window === "undefined") throw new Error("Voice session key unavailable");
  try {
    const saved = window.localStorage.getItem(VOICE_SESSION_KEY);
    if (saved && saved.length >= 24) return saved;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const created = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(VOICE_SESSION_KEY, created);
    return created;
  } catch (error) {
    console.error("[NemoVoice] Could not access the device session key", error);
    throw new Error("VOICE_SESSION_KEY_UNAVAILABLE");
  }
}

export function isVoiceModeOn() {
  try {
    return localStorage.getItem(VOICE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isVoiceMuted() {
  try {
    return localStorage.getItem(VOICE_MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setVoiceMuted(muted: boolean) {
  try {
    localStorage.setItem(VOICE_MUTED_KEY, muted ? "true" : "false");
  } catch (error) {
    console.error("[NemoVoice] Could not save voice mute preference", error);
  }
  window.dispatchEvent(new Event("sanad:voice-mute"));
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

// --- Senior-friendly mode (كبار السن) --------------------------------------
// Larger touch targets, automatic spoken replies, and slower clearer speech.
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
    // Storage may be unavailable; listeners keep the toggle working in-session.
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
    .replace(/[*_#`~>|]/g, " ")
    .replace(/\[|]|[{}()<>"“”]/g, " ")
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
  for (const key of PREFERRED_FEMALE_NAMES) {
    const found = arabic.find((v) => `${v.name} ${v.lang}`.toLowerCase().includes(key));
    if (found) return found;
  }
  return arabic[0] ?? null;
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
export function applyNemoVoice(u: SpeechSynthesisUtterance) {
  applyFemaleVoice(u);
  u.pitch = 1;
  // Senior mode speaks slower so older users can follow every word.
  u.rate = isSeniorModeOn() ? 0.72 : 0.82;
}

export function speak(text: string, onEnd?: (success: boolean) => void) {
  if (isVoiceMuted()) {
    onEnd?.(true);
    return () => {};
  }
  if (typeof window === "undefined") {
    onEnd?.(false);
    return () => {};
  }
  // Neural Arabic voice first (online); fall back to device voices on any failure.
  if (navigator.onLine !== false) {
    let cancelled = false;
    let fallbackStop: (() => void) | null = null;
    let audio: HTMLAudioElement | null = null;
    let url: string | null = null;
    const ctrl = new AbortController();
    const fallback = () => {
      if (!cancelled) fallbackStop = speakDevice(text, onEnd);
    };
    void (async () => {
      try {
        const res = await fetch("/api/public/nemo-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanForSpeech(text), calm: isSeniorModeOn() }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        audio = new Audio(url);
        if (isSeniorModeOn()) audio.playbackRate = 0.92;
        audio.onended = () => !cancelled && onEnd?.(true);
        audio.onerror = () => fallback();
        await audio.play();
      } catch (error) {
        if (cancelled) return;
        console.warn("[NemoVoice] neural voice unavailable, using device voice", error);
        fallback();
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
      audio?.pause();
      if (url) URL.revokeObjectURL(url);
      fallbackStop?.();
    };
  }
  return speakDevice(text, onEnd);
}

function speakDevice(text: string, onEnd?: (success: boolean) => void) {
  if (Capacitor.isNativePlatform()) {
    let cancelled = false;
    let nativeTts: typeof import("@capacitor-community/text-to-speech").TextToSpeech | null = null;
    void (async () => {
      try {
        const { TextToSpeech } = await import("@capacitor-community/text-to-speech");
        nativeTts = TextToSpeech;
        const { languages } = await TextToSpeech.getSupportedLanguages();
        const language =
          languages.find((item) => item.toLowerCase() === "ar-eg") ??
          languages.find((item) => item.toLowerCase().startsWith("ar"));
        if (!language) {
          if (!cancelled) onEnd?.(false);
          return;
        }
        if (cancelled) return;
        await TextToSpeech.speak({
          text: cleanForSpeech(text),
          lang: language,
          pitch: 1,
          rate: isSeniorModeOn() ? 0.72 : 0.82,
          volume: 1,
        });
        if (!cancelled) onEnd?.(true);
      } catch (error) {
        if (!cancelled) {
          console.error("[NemoVoice] Native Arabic speech failed", error);
          onEnd?.(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (nativeTts) {
        void nativeTts.stop().catch((error: unknown) => {
          console.warn("[NemoVoice] Could not stop native speech", error);
        });
      }
    };
  }
  if (!getBestFemaleArabicVoice()) {
    onEnd?.(false);
    return () => {};
  }
  if (!window.speechSynthesis) {
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
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function createBrowserRecognizer(): Rec | null {
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

function createRecorderRecognizer(): Rec | null {
  if (
    typeof window === "undefined" ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof MediaRecorder === "undefined"
  ) {
    return null;
  }
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let stopTimer: number | undefined;
  let stopped = false;
  const recognizer: Rec = {
    lang: "ar-EG",
    interimResults: false,
    continuous: false,
    onresult: () => {},
    onerror: () => {},
    onend: () => {},
    start() {
      void (async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
            MediaRecorder.isTypeSupported(type),
          );
          recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          chunks = [];
          stopped = false;
          recorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
          };
          recorder.onerror = () => {
            recognizer.onerror?.({ error: "audio-capture" });
            stopTracks();
          };
          recorder.onstop = () => {
            void transcribe();
          };
          recorder.start(500);
          stopTimer = window.setTimeout(() => recognizer.stop(), 10_000);
        } catch (error) {
          console.error("[NemoVoice] Could not record speech", error);
          recognizer.onerror?.({ error: "not-allowed" });
          recognizer.onend?.();
        }
      })();
    },
    stop() {
      if (recorder?.state === "recording") recorder.stop();
    },
    abort() {
      stopped = true;
      window.clearTimeout(stopTimer);
      if (recorder?.state === "recording") recorder.stop();
      stopTracks();
    },
  };

  function stopTracks() {
    window.clearTimeout(stopTimer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  async function transcribe() {
    if (stopped) {
      stopTracks();
      return;
    }
    try {
      const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
      if (!blob.size) throw new Error("EMPTY_AUDIO");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const { voiceTranscribe } = await import("@/lib/voice-assist.functions");
      const { text } = await voiceTranscribe({
        data: {
          audio: btoa(binary),
          mime: (blob.type || "audio/webm").split(";")[0],
          sessionKey: getVoiceSessionKey(),
        },
      });
      const transcript = text.trim();
      if (!transcript) throw new Error("EMPTY_TRANSCRIPT");
      recognizer.onresult?.({
        results: [[{ transcript, isFinal: true }]],
      });
      recognizer.onend?.();
    } catch (error) {
      console.error("[NemoVoice] Speech transcription failed", error);
      recognizer.onerror?.({ error: "network" });
      recognizer.onend?.();
    } finally {
      stopTracks();
    }
  }

  return recognizer;
}

function createNativeRecognizer(): Rec {
  let latest = "";
  let ready = false;
  let stopped = false;
  let plugin: typeof import("@capacitor-community/speech-recognition").SpeechRecognition | null =
    null;
  let listenerHandles: Array<{ remove: () => Promise<void> }> = [];
  const recognizer: Rec = {
    lang: "ar-EG",
    interimResults: true,
    continuous: false,
    onresult: () => {},
    onerror: () => {},
    onend: () => {},
    start() {
      stopped = false;
      latest = "";
      void (async () => {
        try {
          const module = await import("@capacitor-community/speech-recognition");
          plugin = module.SpeechRecognition;
          const { available } = await plugin.available();
          if (!available) throw new Error("speech-recognition-unavailable");
          const permission = await plugin.checkPermissions();
          if (permission.speechRecognition !== "granted") {
            const requested = await plugin.requestPermissions();
            if (requested.speechRecognition !== "granted") {
              throw new Error("not-allowed");
            }
          }
          listenerHandles = [
            await plugin.addListener("partialResults", ({ matches }) => {
              latest = matches?.[0]?.trim() ?? latest;
              if (!latest || stopped) return;
              recognizer.onresult?.({
                results: [[{ transcript: latest, isFinal: false }]],
              });
            }),
            await plugin.addListener("listeningState", ({ status }) => {
              if (status === "stopped" && ready) finish();
            }),
          ];
          await plugin.start({
            language: "ar-EG",
            maxResults: 1,
            partialResults: true,
            popup: false,
          });
          ready = true;
        } catch (error) {
          console.error("[NemoVoice] Native speech recognition unavailable", error);
          cleanup();
          const fallback = createBrowserRecognizer() ?? createRecorderRecognizer();
          if (fallback) {
            recognizer.onresult = (event) => recognizerResult(event);
            fallback.onresult = recognizer.onresult;
            fallback.onerror = (event) => recognizer.onerror?.(event);
            fallback.onend = () => recognizer.onend?.();
            recognizer.stop = () => fallback.stop();
            recognizer.abort = () => fallback.abort?.();
            fallback.start();
          } else {
            recognizer.onerror?.({
              error: /not-allowed/.test(String(error)) ? "not-allowed" : "unsupported",
            });
            recognizer.onend?.();
          }
        }
      })();
    },
    stop() {
      if (!plugin || stopped) return;
      void plugin.stop().finally(finish);
    },
    abort() {
      stopped = true;
      if (plugin) void plugin.stop().finally(cleanup);
      else cleanup();
    },
  };

  function recognizerResult(event: Parameters<NonNullable<Rec["onresult"]>>[0]) {
    recognizer.onresult?.(event);
  }
  function finish() {
    if (stopped) return;
    stopped = true;
    if (latest) {
      recognizer.onresult?.({ results: [[{ transcript: latest, isFinal: true }]] });
    }
    recognizer.onend?.();
    cleanup();
  }
  function cleanup() {
    ready = false;
    const handles = listenerHandles;
    listenerHandles = [];
    for (const handle of handles) void handle.remove();
  }

  return recognizer;
}

export function createRecognizer(): Rec | null {
  if (typeof window === "undefined") return null;
  if (Capacitor.isNativePlatform()) return createNativeRecognizer();
  return createBrowserRecognizer() ?? createRecorderRecognizer();
}
