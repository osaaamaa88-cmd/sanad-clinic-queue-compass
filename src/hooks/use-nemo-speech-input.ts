import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognizer } from "@/lib/voice";
import { finalNemoTranscript } from "@/lib/nemo-conversation";

type SpeechInputOptions = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string | null) => void;
  onError?: (error: string) => void;
  silenceMs?: number;
};

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
