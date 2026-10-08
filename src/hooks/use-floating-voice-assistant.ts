import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createRecognizer, isVoiceModeOn, setVoiceMode, speak } from "@/lib/voice";
import { voiceAssist } from "@/lib/voice-assist.functions";
import { getPatientLocation } from "@/lib/patient-location";

export type VoiceAssistantState = "listening" | "speaking" | "thinking" | "paused" | "error";

export function useFloatingVoiceAssistant(allowed = true) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<VoiceAssistantState>("paused");
  const [message, setMessage] = useState("");
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    const sync = () => setEnabled(allowed && isVoiceModeOn());
    sync();
    window.addEventListener("sanad:voice-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sanad:voice-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, [allowed]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let blocked = false;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let recognition: ReturnType<typeof createRecognizer> = null;
    let cancelSpeech = () => {};
    let hospital: Awaited<ReturnType<typeof voiceAssist>>["hospital"] = null;
    let pendingCall = false;
    let lastExchange = "";

    const stopMedia = () => {
      clearTimeout(timer);
      if (recognition) {
        recognition.onend = () => {};
        recognition.onresult = () => {};
        recognition.onerror = () => {};
        try { recognition.abort ? recognition.abort() : recognition.stop(); } catch {}
        recognition = null;
      }
      cancelSpeech();
    };
    const fail = (text: string) => {
      blocked = true;
      generation++;
      stopMedia();
      setState("error");
      setMessage(text);
      toast.error(text);
    };
    const scheduleListen = () => {
      if (!active || blocked || document.hidden) return;
      clearTimeout(timer);
      timer = setTimeout(listen, 350);
    };
    const say = (text: string, after?: () => void) => {
      if (!active || blocked || document.hidden) return;
      setMessage(text);
      setState("speaking");
      cancelSpeech = speak(text, (success) => {
        if (!active || blocked || document.hidden) return;
        if (!success) { fail("الصوت التلقائي غير متاح؛ اضغط على الفقاعة للاستئناف أو اسمح بالصوت في المتصفح."); return; }
        if (after) after();
        else scheduleListen();
      });
    };
    const handle = async (text: string) => {
      if (!active || blocked) return;
      const normalized = text.trim().replace(/[؟?!.,،]/g, "");
      if (/^(وقف|توقف|اسكت|اقفل المساعد|إيقاف المساعد)$/.test(normalized)) {
        setVoiceMode(false);
        return;
      }
      if (pendingCall && /^(نعم|أيوه|ايوه|أكد الاتصال|اتصل)$/.test(normalized) && hospital) {
        pendingCall = false;
        const phone = hospital.phone.replace(/[^+\d]/g, "");
        if (!phone) { say("رقم المستشفى مش متاح حالياً."); return; }
        say(`حاضر، هفتح الاتصال بـ ${hospital.name}.`, () => {
          if (!active) return;
          window.location.href = `tel:${phone}`;
          scheduleListen();
        });
        return;
      }
      pendingCall = false;
      if (hospital && /^(اتصل|اتصل بالمستشفى|كلم المستشفى|كلمهم)$/.test(normalized)) {
        pendingCall = true;
        say(`تحب أفتح الاتصال بـ ${hospital.name}؟ قول أكد الاتصال أو لا.`);
        return;
      }
      if (hospital && /^(العنوان|عنوان|اوصف العنوان|أوصف العنوان|ازاي اروح|إزاي أروح)$/.test(normalized)) {
        say(`${hospital.name}، عنوانها ${hospital.address}.${hospital.approx ? " الموقع على الخريطة تقريبي." : ""}`);
        return;
      }
      const request = ++generation;
      setState("thinking");
      setMessage("بفكر في كلامك…");
      try {
        const loc = getPatientLocation();
        const context = lastExchange ? `${lastExchange}\nمتابعة المستخدم: ${text}` : text;
        const result = await voiceAssist({ data: { text: context.slice(-500), lat: loc.lat, lng: loc.lng } });
        if (!active || blocked || request !== generation || document.hidden) return;
        hospital = result.hospital;
        lastExchange = `السؤال السابق: ${text.slice(0, 100)}\nالرد السابق: ${result.reply.slice(0, 200)}`;
        if (!result.ai) toast.warning("التحليل الذكي غير متاح حالياً؛ الرد من دليل المستشفيات، وليس تحليلًا للأعراض.");
        say(result.reply);
      } catch {
        if (active && request === generation) fail("تعذر الاتصال بالمساعد. لو الحالة طارئة اتصل بالإسعاف 123.");
      }
    };
    function listen() {
      if (!active || blocked || document.hidden) return;
      const r = createRecognizer();
      if (!r) { fail("الميكروفون غير مدعوم في المتصفح ده؛ جرّب متصفح يدعم الإدخال الصوتي."); return; }
      recognition = r;
      let gotResult = false;
      setState("listening");
      setMessage("أنا سامعاك، اتفضل اتكلم.");
      r.onresult = (event) => {
        if (!active || blocked || gotResult) return;
        const text = event.results[0]?.[0]?.transcript?.trim();
        if (!text) return;
        gotResult = true;
        r.onend = () => {};
        r.stop();
        recognition = null;
        void handle(text);
      };
      r.onerror = ({ error }) => {
        if (!active || blocked) return;
        if (error === "no-speech") return;
        fail(error === "not-allowed" || error === "service-not-allowed"
          ? "اسمح بالميكروفون من إعدادات المتصفح، ثم اضغط الفقاعة للاستئناف."
          : error === "audio-capture" ? "الميكروفون غير متاح؛ تأكد إنه متصل ومش مستخدم في مكالمة."
          : "الإدخال الصوتي توقف؛ تأكد من الإنترنت ثم اضغط الفقاعة للاستئناف.");
      };
      r.onend = () => {
        if (recognition === r) recognition = null;
        if (!gotResult) scheduleListen();
      };
      try { r.start(); } catch { fail("المتصفح محتاج تفعيل الميكروفون؛ اضغط الفقاعة للاستئناف."); }
    }
    const visibility = () => {
      generation++;
      stopMedia();
      pendingCall = false;
      if (document.hidden) setState("paused");
      else if (!blocked) scheduleListen();
    };
    document.addEventListener("visibilitychange", visibility);
    if (!createRecognizer() || !window.speechSynthesis) {
      fail("المتصفح ده مش بيدعم المساعد الصوتي بالكامل؛ جرّب متصفح يدعم الميكروفون والصوت.");
    } else {
      say("أهلاً بك في سَنَد، أنا هنا لمساعدتك. احكيلي إيه اللي تعبك، وهنلاقي المساعدة المناسبة سوا.");
    }
    return () => {
      active = false;
      generation++;
      stopMedia();
      document.removeEventListener("visibilitychange", visibility);
      // Wipe any transcript/reply text held in state as soon as the session ends.
      setMessage("");
      setState("paused");
    };
  }, [enabled, restart]);

  return { enabled, state, message, resume: () => setRestart((v) => v + 1), stop: () => setVoiceMode(false) };
}