import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognizer } from "@/lib/voice";
import { finalNemoTranscript } from "@/lib/nemo-conversation";

type SpeechInputOptions = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string | null) => void;
  onError?: (error: string) => void;
  silenceMs?: number;
};

async function startVoiceActivity(isActive: () => boolean, onVoice: () => void) {
  if (typeof AudioContext === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let noise = 0.01;
    const tick = () => {
      if (!isActive()) {
        stream?.getTracks().forEach((t) => t.stop());
        void ctx?.close();
        return;
      }
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      if (rms > Math.max(0.03, noise * 2.5)) onVoice();
      else noise = noise * 0.95 + rms * 0.05;
      window.setTimeout(tick, 150);
    };
    tick();
  } catch {
    stream?.getTracks().forEach((t) => t.stop());
    void ctx?.close();
  }
}

export function useNemoSpeechInput(options: SpeechInputOptions = {}) {
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    setListening(false);
    if (!recognizer) return;
    recognizer.onend = null;
    recognizer.onresult = null;
    recognizer.onerror = null;
    try {
      if (recognizer.abort) recognizer.abort();
      else recognizer.stop();
    } catch (error) {
      console.warn("[NemoVoice] Could not stop speech recognition", error);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("sanad:background", stop);
    return () => window.removeEventListener("sanad:background", stop);
  }, [stop]);

  const start = useCallback(() => {
    if (recognizerRef.current) return false;
    const recognizer = createRecognizer();
    if (!recognizer) {
      optionsRef.current.onError?.("unsupported");
      return false;
    }
    recognizerRef.current = recognizer;
    recognizer.lang = "ar-EG";
    recognizer.interimResults = true;
    recognizer.continuous = false;
    let finalText = "";
    let interimText = "";
    recognizer.onresult = (event) => {
      if (recognizerRef.current !== recognizer) return;
      finalText = finalNemoTranscript(event.results);
      interimText = Array.from(event.results)
        .filter((result) => !result.isFinal)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      optionsRef.current.onPartial?.([finalText, interimText].filter(Boolean).join(" "));
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognizerRef.current === recognizer) recognizer.stop();
      }, optionsRef.current.silenceMs ?? 1600);
    };
    recognizer.onerror = ({ error }) => {
      if (recognizerRef.current !== recognizer) return;
      if (error === "no-speech") return;
      stop();
      if (error !== "aborted") optionsRef.current.onError?.(error);
    };
    recognizer.onend = () => {
      if (recognizerRef.current !== recognizer) return;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      recognizerRef.current = null;
      setListening(false);
      const heard = (finalText || interimText).replace(/\s+/g, " ").trim();
      optionsRef.current.onFinal?.(heard.length >= 2 ? heard : null);
    };
    // Voice activity detection: while the mic still hears the patient's voice,
    // keep pushing the silence timer back so a slow speaker is never cut off.
    void startVoiceActivity(() => recognizerRef.current === recognizer, () => {
      if (!silenceTimerRef.current) return;
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognizerRef.current === recognizer) recognizer.stop();
      }, optionsRef.current.silenceMs ?? 1600);
    });
    try {
      recognizer.start();
      setListening(true);
      return true;
    } catch (error) {
      stop();
      console.error("[NemoVoice] Could not start speech recognition", error);
      optionsRef.current.onError?.("start-failed");
      return false;
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { listening, start, stop };
}
