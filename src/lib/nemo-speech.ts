import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  applyNemoVoice,
  cleanForSpeech,
  getBestFemaleArabicVoice,
  isVoiceMuted,
  speak as speakVoice,
} from "@/lib/voice";

function nemoSpeechText(text: string) {
  return cleanForSpeech(text)
    .replace(/[.,:;\-–—]+/g, "،")
    .replace(/،\s*،+/g, "،")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function speakArabic(text: string, onEnd: (success: boolean) => void): () => void {
  if (typeof window === "undefined") {
    toast.error("القراءة الصوتية مش مدعومة على الجهاز ده");
    onEnd(false);
    return () => {};
  }
  const spokenText = nemoSpeechText(text);

  // Native Android WebView also exposes the standard speechSynthesis API,
  // so we use the same browser path everywhere. A dynamic import of
  // @capacitor-community/text-to-speech previously crashed SSR workers
  // with "window is not defined" and made the published site return 500.
  if (!("speechSynthesis" in window)) {
    toast.error("القراءة الصوتية مش مدعومة على الجهاز ده");
    onEnd(false);
    return () => {};
  }
  if (isVoiceMuted()) {
    onEnd(true);
    return () => {};
  }
  if (Capacitor.isNativePlatform()) return speakVoice(text, onEnd);
  if (!getBestFemaleArabicVoice()) {
    toast.warning("نطق العربية غير متاح على هذا الجهاز. يمكنك قراءة الرد أو تثبيت صوت عربي.");
    onEnd(false);
    return () => {};
  }

  const synthesis = window.speechSynthesis;
  if (synthesis.speaking || synthesis.pending) synthesis.cancel();

  // Chrome/Android silently drop long utterances (~15s) and speech issued
  // right after cancel(), so speak sentence-sized chunks after a short delay.
  const chunks = (spokenText.match(/[^.!؟?،,\n]{1,160}[.!؟?،,\n]?/g) ?? [spokenText])
    .map((c) => c.trim())
    .filter(Boolean);

  let cancelled = false;
  let started = false;
  let completed = false;
  let index = 0;
  let keepAlive = 0;
  const finish = (success: boolean) => {
    if (cancelled || completed) return;
    completed = true;
    window.clearTimeout(startTimer);
    window.clearInterval(keepAlive);
    onEnd(success);
  };
  const speakNext = () => {
    if (cancelled || completed) return;
    if (index >= chunks.length) return finish(true);
    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
    applyNemoVoice(utterance);
    utterance.volume = 1;
    utterance.onstart = () => {
      started = true;
      window.clearTimeout(startTimer);
    };
    utterance.onend = speakNext;
    utterance.onerror = (event) => {
      if (cancelled || completed) return;
      if (event.error === "interrupted" || event.error === "canceled") return;
      console.warn("[Nemo] Browser speech error:", event.error);
      finish(false);
    };
    synthesis.speak(utterance);
    if (synthesis.paused) synthesis.resume();
  };
  const startTimer = window.setTimeout(() => {
    if (started || cancelled || completed) return;
    synthesis.cancel();
    console.warn("[Nemo] Speech playback blocked by browser");
    toast.info("اضغط على زر السماعة جنب الرسالة عشان تسمع نيمو", { id: "nemo-audio" });
    finish(false);
  }, 6000);
  // Keep Chrome's speech engine from pausing itself mid-reply.
  keepAlive = window.setInterval(() => {
    if (synthesis.speaking && synthesis.paused) synthesis.resume();
  }, 4000);

  const begin = () => window.setTimeout(speakNext, 120);
  if (synthesis.getVoices().length) begin();
  else {
    let launched = false;
    const go = () => {
      if (launched) return;
      launched = true;
      synthesis.removeEventListener("voiceschanged", go);
      begin();
    };
    synthesis.addEventListener("voiceschanged", go);
    window.setTimeout(go, 800);
  }
  return () => {
    cancelled = true;
    window.clearTimeout(startTimer);
    window.clearInterval(keepAlive);
    synthesis.cancel();
  };
}
