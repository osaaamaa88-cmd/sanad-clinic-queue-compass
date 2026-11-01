import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getVoiceSessionKey, isVoiceMuted, isVoiceModeOn, setVoiceMode, speak } from "@/lib/voice";
import { voiceAssist } from "@/lib/voice-assist.functions";
import { getPatientLocation } from "@/lib/patient-location";
import { getLocalNemoReply, runLocalTriage } from "@/lib/triage-local";
import { useAiConsent } from "@/components/AiConsentDialog";
import { useNemoSpeechInput } from "@/hooks/use-nemo-speech-input";

export type VoiceAssistantState = "listening" | "speaking" | "thinking" | "paused" | "error";

export function useFloatingVoiceAssistant(allowed = true) {
  const consent = useAiConsent();
  const speechHandlersRef = useRef<{
    onText: (text: string) => void;
    onEmpty: () => void;
    onError: (error: string) => void;
  }>({
    onText: () => {},
    onEmpty: () => {},
    onError: () => {},
  });
  const speechInput = useNemoSpeechInput({
    onFinal: (text) => {
      if (text) speechHandlersRef.current.onText(text);
      else speechHandlersRef.current.onEmpty();
    },
    onError: (error) => speechHandlersRef.current.onError(error),
  });
  const askConsent = consent.ask;
  const startSpeechInput = speechInput.start;
  const stopSpeechInput = speechInput.stop;
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
    let cancelSpeech = () => {};
    let hospital: Awaited<ReturnType<typeof voiceAssist>>["hospital"] = null;
    let pendingCall = false;
    let lastExchange = "";

    const stopMedia = () => {
      clearTimeout(timer);
      stopSpeechInput();
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
      if (isVoiceMuted()) {
        if (after) after();
        else scheduleListen();
        return;
      }
      setState("speaking");
      cancelSpeech = speak(text, (success) => {
        if (!active || blocked || document.hidden) return;
        if (!success) {
          setMessage(
            "نطق العربية تلقائياً غير متاح؛ يمكنك قراءة الرد أو التحدث معي. اسمح بالميكروفون إذا طُلب منك.",
          );
          toast.warning("نطق العربية تلقائياً غير متاح؛ سيظل المساعد يستمع لك.");
          scheduleListen();
          return;
        }
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
        if (!phone) {
          say("رقم المستشفى مش متاح حالياً.");
          return;
        }
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
      if (
        hospital &&
        /^(العنوان|عنوان|اوصف العنوان|أوصف العنوان|ازاي اروح|إزاي أروح)$/.test(normalized)
      ) {
        say(
          `${hospital.name}، عنوانها ${hospital.address}.${hospital.approx ? " الموقع على الخريطة تقريبي." : ""}`,
        );
        return;
      }
      const request = ++generation;
      const localTriage = runLocalTriage(text);
      if (localTriage.urgency === "emergency") {
        say(getLocalNemoReply(text, localTriage));
        return;
      }
      if (!(await askConsent())) {
        setVoiceMode(false);
        return;
      }
      setState("thinking");
      setMessage("بفكر في كلامك…");
      try {
        const loc = getPatientLocation();
        const context = lastExchange ? `${lastExchange}\nمتابعة المستخدم: ${text}` : text;
        const result = await voiceAssist({
          data: {
            text: context.slice(-500),
            lat: loc.lat,
            lng: loc.lng,
            sessionKey: getVoiceSessionKey(),
          },
        });
        if (!active || blocked || request !== generation || document.hidden) return;
        hospital = result.hospital;
        lastExchange = `السؤال السابق: ${text.slice(0, 100)}\nالرد السابق: ${result.reply.slice(0, 200)}`;
        if (!result.ai)
          toast.warning(
            "التحليل الذكي غير متاح حالياً؛ الرد من دليل المستشفيات، وليس تحليلًا للأعراض.",
          );
        say(result.reply);
      } catch (assistantError) {
        if (active && request === generation) {
          console.error(
            "[voice-assistant] AI unavailable; using a safe local reply",
            assistantError,
          );
          toast.warning("تعذر الاتصال بالمساعد الذكي الآن، أقدّم لك توجيهاً أولياً حسب الأعراض.");
          say(getLocalNemoReply(text, localTriage));
        }
      }
    };
    speechHandlersRef.current.onText = (text) => void handle(text);
    speechHandlersRef.current.onEmpty = () => scheduleListen();
    speechHandlersRef.current.onError = (error) => {
      if (error === "unsupported") {
        fail("الميكروفون غير مدعوم أو التسجيل الصوتي غير متاح على هذا الجهاز.");
      } else if (error === "not-allowed" || error === "service-not-allowed") {
        fail("اسمح بالميكروفون من إعدادات الجهاز، ثم اضغط الفقاعة للاستئناف.");
      } else if (error !== "aborted") {
        fail("الإدخال الصوتي توقف؛ تأكد من الاتصال ثم اضغط الفقاعة للاستئناف.");
      }
    };
    const quickPain = (event: Event) => {
      const level = (event as CustomEvent<number>).detail;
      if (!Number.isInteger(level) || level < 1 || level > 10 || !active || blocked) return;
      cancelSpeech();
      stopSpeechInput();
      void handle(`مستوى الألم عندي ${level} من 10`);
    };
    const finishSession = () => {
      if (!active || blocked) return;
      pendingCall = false;
      cancelSpeech();
      stopSpeechInput();
      say("شكراً لثقتك في نيمو. أتمنى لك دوام الصحة والعافية.", () => setVoiceMode(false));
    };
    window.addEventListener("sanad:voice-pain", quickPain);
    window.addEventListener("sanad:voice-finish", finishSession);
    function listen() {
      if (!active || blocked || document.hidden) return;
      setState("listening");
      setMessage("أنا سامعاك، اتفضل اتكلم.");
      startSpeechInput();
    }
    const visibility = () => {
      generation++;
      stopMedia();
      pendingCall = false;
      if (document.hidden) setState("paused");
      else if (!blocked) scheduleListen();
    };
    document.addEventListener("visibilitychange", visibility);
    const OFFLINE_MSG = "المساعد الصوتي يحتاج للاتصال بالإنترنت";
    const goOffline = () => {
      blocked = true;
      generation++;
      stopMedia();
      setState("error");
      setMessage(OFFLINE_MSG);
      toast.info(OFFLINE_MSG);
    };
    const goOnline = () => setRestart((v) => v + 1);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    if (!navigator.onLine) {
      goOffline();
    } else {
      void askConsent().then((allowed) => {
        if (!active) return;
        if (!allowed) {
          setVoiceMode(false);
          return;
        }
        say(
          "أهلاً بك في سند، أنا هنا لمساعدتك. احكيلي إيه اللي تعبك، وهنلاقي المساعدة المناسبة سوا.",
        );
      });
    }
    return () => {
      active = false;
      generation++;
      stopMedia();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("sanad:voice-pain", quickPain);
      window.removeEventListener("sanad:voice-finish", finishSession);
      // Wipe any transcript/reply text held in state as soon as the session ends.
      setMessage("");
      setState("paused");
    };
  }, [askConsent, enabled, restart, startSpeechInput, stopSpeechInput]);

  return {
    enabled,
    state,
    message,
    consentDialog: consent.dialog,
    resume: () => setRestart((v) => v + 1),
    stop: () => setVoiceMode(false),
  };
}
