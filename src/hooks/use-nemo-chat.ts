import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getVoiceSessionKey, isVoiceMuted, isSeniorModeOn } from "@/lib/voice";
import {
  getPatientLocation,
  distanceKm,
  defaultLocation,
  type PatientLocation,
} from "@/lib/patient-location";
import { getVerifiedClinics, type Clinic } from "@/lib/mock-data";
import {
  getLocalNemoReply,
  hasSelfHarmIntent,
  mergeTriageUrgency,
  replyMentionsEmergency,
  runLocalTriage,
  type TriageResult,
} from "@/lib/triage-local";
import { voiceAssist } from "@/lib/voice-assist.functions";
import { useAiConsent, aiErrorMessage } from "@/components/AiConsentDialog";
import { readLab, scanDrug } from "@/lib/medscan.functions";
import { imageToBase64 } from "@/lib/image-to-base64";
import { isNemoSessionComplete, shouldResumeNemo } from "@/lib/nemo-conversation";
import { useNemoSpeechInput } from "@/hooks/use-nemo-speech-input";
import { listHospitals, type Hospital as HospitalRow } from "@/lib/hospitals.functions";
import { speakArabic } from "@/lib/nemo-speech";
import { hospitalMatchesSpecialty } from "@/lib/hospital-matching";

const GREETING_DISPLAY = "مرحباً، أنا نيمو، رفيقك الشخصي للرعاية الصحية. كيف تشعر اليوم؟";
const CLOSING_MESSAGE = "انتهت محادثتنا. أتمنى لك السلامة، ونيمو موجود لمساعدتك وقت ما تحتاج.";

type ChatMessage = { id: number; role: "patient" | "nemo"; text: string; image?: string };

/**
 * Owns the whole Nemo chat state machine: messages, hands-free speech
 * sessions, image analysis, triage and nearby care matching. The route
 * component only renders; every lifecycle and timing rule lives here,
 * unchanged from when it lived inline in the route.
 */
export function useNemoChat() {
  const [need, setNeed] = useState("");
  useEffect(() => {
    try {
      const pre = sessionStorage.getItem("sanad_nemo_prefill");
      if (pre) {
        sessionStorage.removeItem("sanad_nemo_prefill");
        setNeed(pre);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const [loc, setLoc] = useState<PatientLocation>(defaultLocation);
  const [picker, setPicker] = useState(false);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageUrgent, setImageUrgent] = useState(false);
  const consent = useAiConsent();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [handsFree, setHandsFree] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [painScaleDismissed, setPainScaleDismissed] = useState(false);
  const [happy, setHappy] = useState(false);
  const [muted, setMuted] = useState(isVoiceMuted());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, role: "nemo", text: GREETING_DISPLAY },
  ]);
  const [selfHarmFlag, setSelfHarmFlag] = useState(false);
  /**
   * Self-harm support card should stay visible for the whole conversation once it
   * appears — clearing it on the next message removes crisis support mid-chat.
   */
  const raiseSelfHarmFlag = () => setSelfHarmFlag(true);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(1);
  const providerWarningShownRef = useRef(false);
  const handsFreeRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const speechInput = useNemoSpeechInput({
    onPartial: setNeed,
    onFinal: (text) => {
      if (!text || !mountedRef.current || !handsFreeRef.current) return;
      setNeed(text);
      void submitRef.current(text);
    },
    onError: (error) => {
      disableHandsFree();
      if (error === "unsupported") {
        toast.error("لا يتوفر إدخال صوتي أو تسجيل على هذا الجهاز.");
      } else if (error === "not-allowed" || error === "service-not-allowed") {
        toast.error("المايكروفون مرفوض — اسمح بالوصول للمايك من إعدادات المتصفح");
      } else if (error !== "aborted") {
        toast.error("مش قادر أسمعك دلوقتي — جرّب تاني");
      }
    },
  });
  const { listening } = speechInput;
  const speechStopRef = useRef(speechInput.stop);
  speechStopRef.current = speechInput.stop;
  const disableHandsFreeRef = useRef(disableHandsFree);
  disableHandsFreeRef.current = disableHandsFree;
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [senior, setSenior] = useState(isSeniorModeOn());

  useEffect(() => {
    const syncSenior = () => setSenior(isSeniorModeOn());
    const syncMute = () => setMuted(isVoiceMuted());
    window.addEventListener("sanad:senior-mode", syncSenior);
    window.addEventListener("storage", syncSenior);
    window.addEventListener("sanad:voice-mute", syncMute);
    return () => {
      window.removeEventListener("sanad:senior-mode", syncSenior);
      window.removeEventListener("storage", syncSenior);
      window.removeEventListener("sanad:voice-mute", syncMute);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const pauseWhenHidden = () => {
      if (document.hidden) {
        disableHandsFreeRef.current();
        stopSpeechRef.current?.();
        stopSpeechRef.current = null;
        setSpeaking(false);
        setSpeakingMessageId(null);
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => {
      mountedRef.current = false;
      handsFreeRef.current = false;
      requestRef.current += 1;
      speechStopRef.current();
      stopSpeechRef.current?.();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
    };
  }, []);

  useEffect(() => {
    if (!shouldResumeNemo({ enabled: handsFree, listening, speaking, loading, complete: happy }))
      return;
    const timer = window.setTimeout(() => {
      if (mountedRef.current && handsFreeRef.current && !document.hidden)
        startListeningRef.current();
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [handsFree, listening, speaking, loading, happy]);

  useEffect(() => {
    const container = chatContainerRef.current;
    const messages = container?.querySelectorAll(".nemo-chat-message");
    messages?.item(messages.length - 1)?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages]);

  useEffect(() => {
    setLoc(getPatientLocation());
    getVerifiedClinics()
      .then(setClinics)
      .catch((loadError: unknown) => {
        console.error("[Nemo] Could not load verified clinics", loadError);
        toast.error("تعذر تحميل العيادات حالياً");
      });
    listHospitals()
      .then(setHospitals)
      .catch((loadError: unknown) => {
        console.error("[Nemo] Could not load hospitals", loadError);
        toast.error("تعذر تحميل بيانات المستشفيات القريبة");
      });
  }, []);

  function playNemoMessage(message: ChatMessage) {
    if (speaking && speakingMessageId === message.id) {
      stopSpeechRef.current?.();
      stopSpeechRef.current = null;
      setSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }
    speechInput.stop();
    stopSpeechRef.current?.();
    setSpeakingMessageId(message.id);
    setSpeaking(true);
    stopSpeechRef.current = speakArabic(message.text, (success) => {
      if (!mountedRef.current) return;
      if (!success && !isVoiceMuted()) disableHandsFree();
      setSpeaking(false);
      setSpeakingMessageId(null);
      stopSpeechRef.current = null;
    });
  }

  function addChatMessage(role: ChatMessage["role"], text: string) {
    messageIdRef.current += 1;
    const id = messageIdRef.current;
    setChatMessages((messages) => [...messages, { id, role, text }]);
    if (role === "nemo" && (handsFreeRef.current || isSeniorModeOn())) {
      speechInput.stop();
      stopSpeechRef.current?.();
      setSpeakingMessageId(id);
      setSpeaking(true);
      stopSpeechRef.current = speakArabic(text, (success) => {
        if (!mountedRef.current) return;
        if (!success) disableHandsFree();
        setSpeaking(false);
        setSpeakingMessageId(null);
        stopSpeechRef.current = null;
      });
    }
  }

  function addPatientImageMessage(image: string) {
    messageIdRef.current += 1;
    setChatMessages((messages) => [
      ...messages,
      { id: messageIdRef.current, role: "patient", text: "حلّل نيمو الصورة دي", image },
    ]);
  }

  async function analyzeMedicalImage(file?: File) {
    if (!file || loading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختار صورة بصيغة مناسبة");
      return;
    }
    if (!(await consent.ask())) return;

    speechInput.stop();
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeaking(false);
    setSpeakingMessageId(null);
    const requestId = ++requestRef.current;
    setLoading(true);
    setAnalyzingImage(true);
    setImageUrgent(false);
    setResult(null);
    setPainLevel(null);
    setPainScaleDismissed(false);
    setNeed("");

    try {
      const { data, mime, preview } = await imageToBase64(file, 1600);
      if (!mountedRef.current || requestRef.current !== requestId) return;
      addPatientImageMessage(preview);
      const report = await readLab({ data: { image: data, mime, consent: true } });
      if (!mountedRef.current || requestRef.current !== requestId) return;

      if (report.found) {
        setImageUrgent(report.urgent);
        const flagged = report.items
          .filter((item) => item.status === "high" || item.status === "low")
          .slice(0, 4)
          .map(
            (item) =>
              `${item.name}: ${item.value}${item.unit ? ` ${item.unit}` : ""} (${item.status === "high" ? "أعلى من" : "أقل من"} الطبيعي)`,
          );
        const reply = [
          report.comfort,
          report.summary,
          flagged.length ? `خلي بالك من القيم دي: ${flagged.join("، ")}.` : "",
          report.urgent
            ? "النتيجة دي محتاجة مراجعة طبية عاجلة اليوم. لو عندك أعراض شديدة، توجّه للطوارئ أو اتصل بالإسعاف 123."
            : report.questions[0]
              ? `اسأل طبيبك: ${report.questions[0]}`
              : "الشرح استرشادي، والطبيب هو اللي يربط النتيجة بحالتك.",
        ]
          .filter(Boolean)
          .join(" ");
        addChatMessage("nemo", reply);
        return;
      }

      const drug = await scanDrug({ data: { image: data, mime, consent: true } });
      if (!mountedRef.current || requestRef.current !== requestId) return;
      if (!drug.found) {
        addChatMessage(
          "nemo",
          "مش قادر أتعرف على تحليل أو دواء واضح في الصورة. جرّب صورة أوضح وبإضاءة كويسة، أو اكتبلي إيه اللي تحب تعرفه عنها.",
        );
        return;
      }
      const reply = [
        `الصورة باين فيها ${drug.name}${drug.strength ? ` بتركيز ${drug.strength}` : ""}${drug.form ? `، ${drug.form}` : ""}.`,
        drug.active ? `المادة الفعالة: ${drug.active}.` : "",
        "التعرّف على الصورة ممكن يخطئ. تأكد من اسم الدواء ومادته الفعالة مع صيدلي، وما تعتمدش على الصورة لتحديد جرعة أو بديل.",
      ]
        .filter(Boolean)
        .join(" ");
      addChatMessage("nemo", reply);
    } catch (imageError: unknown) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      console.error("[Nemo] Medical image analysis failed", imageError);
      addChatMessage(
        "nemo",
        `ماقدرتش أحلل الصورة دلوقتي. ${aiErrorMessage(imageError)} جرّب تاني بصورة أوضح.`,
      );
    } finally {
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
        setAnalyzingImage(false);
      }
    }
  }

  function disableHandsFree() {
    handsFreeRef.current = false;
    setHandsFree(false);
    speechInput.stop();
  }

  async function toggleListening() {
    if (handsFreeRef.current) {
      disableHandsFree();
      return;
    }
    if (!(await consent.ask())) return;
    if (happy || !mountedRef.current) return;
    // Unlock speech inside this tap so Nemo's later spoken reply isn't blocked.
    try {
      if ("speechSynthesis" in window) {
        const unlock = new SpeechSynthesisUtterance(" ");
        unlock.volume = 0;
        window.speechSynthesis.speak(unlock);
      }
    } catch {
      // ignore
    }
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeaking(false);
    setSpeakingMessageId(null);
    handsFreeRef.current = true;
    setHandsFree(true);
    if (!loading) startListening();
  }

  function startListening() {
    if (!handsFreeRef.current || !mountedRef.current || document.hidden) return;
    speechInput.start();
  }

  async function submit(text: string) {
    const query = text.trim();
    if (query.length < 3 || loading) return;
    void import("@/lib/analytics").then((m) => m.track("nemo_message_sent"));
    if (isNemoSessionComplete(query)) {
      addChatMessage("patient", query);
      finishSession();
      return;
    }
    const localTriage = runLocalTriage(query);
    if (localTriage.urgency === "emergency") {
      addChatMessage("patient", query);
      setResult(localTriage);
      setImageUrgent(false);
      if (hasSelfHarmIntent(query)) raiseSelfHarmFlag();
      addChatMessage("nemo", getLocalNemoReply(query, localTriage));
      setNeed("");
      return;
    }
    if (!(await consent.ask())) return;
    speechInput.stop();
    const requestId = ++requestRef.current;
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeaking(false);
    setSpeakingMessageId(null);
    setLoading(true);
    setImageUrgent(false);
    setNeed("");
    setPainLevel(null);
    setPainScaleDismissed(false);
    addChatMessage("patient", query);
    setResult(localTriage);

    try {
      const response = await voiceAssist({
        data: {
          text: query,
          lat: loc.lat,
          lng: loc.lng,
          sessionKey: getVoiceSessionKey(),
          history: chatMessages
            .filter((message) => message.role === "patient")
            .slice(-6)
            .map((message) => ({ role: "user" as const, content: message.text })),
        },
      });
      if (!mountedRef.current || requestRef.current !== requestId) return;
      const reply = response.reply.trim();
      if (!reply) throw new Error("Nemo returned an empty reply");
      const mergedTriage = mergeTriageUrgency({ ...localTriage, urgency: response.urgency }, query);
      setResult({
        ...mergedTriage,
        urgency: replyMentionsEmergency(reply) ? "emergency" : mergedTriage.urgency,
      });
      addChatMessage("nemo", reply);
      if (!response.ai && !providerWarningShownRef.current) {
        providerWarningShownRef.current = true;
        toast.warning("المساعد الذكي غير متاح حالياً، أقدّم لك توجيهاً أولياً حسب الأعراض.");
      }
    } catch (assistantError) {
      if (!mountedRef.current || requestRef.current !== requestId) return;
      console.error("[Nemo] AI assistant unavailable; using a safe local reply", assistantError);
      const fallbackReply = getLocalNemoReply(query, localTriage);
      addChatMessage("nemo", fallbackReply);
      toast.warning("تعذر الاتصال بالمساعد الذكي الآن، أقدّم لك توجيهاً أولياً حسب الأعراض.");
    } finally {
      if (mountedRef.current && requestRef.current === requestId) setLoading(false);
    }
  }

  function selectPain(level: number) {
    setPainLevel(level);
    setResult((current) =>
      current && level >= 8 ? { ...current, urgency: "emergency" } : current,
    );
    setHappy(false);
    addChatMessage("patient", `مستوى الألم عندي ${level} من 10`);
    if (level <= 3) {
      const reply =
        "ألف سلامة عليك، يبدو أن الألم خفيف. خذ قسطاً من الراحة واشرب سوائل مناسبة، وأسأل الله لك الشفاء.";
      addChatMessage("nemo", reply);
    } else if (level <= 7) {
      const reply =
        "ألف سلامة عليك يا غالي، أين موضع الألم ومنذ متى بدأ؟ إذا استمر أو زاد، راجع الطبيب المناسب.";
      addChatMessage("nemo", reply);
    } else {
      const reply =
        "هذا الألم شديد ويحتاج رعاية فورية. اتصل بالإسعاف 123 الآن أو توجّه لأقرب مستشفى، خصوصاً مع ألم الصدر أو صعوبة التنفس.";
      addChatMessage("nemo", reply);
    }
    setPainScaleDismissed(true);
    window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  function finishSession() {
    if (happy) return;
    disableHandsFree();
    requestRef.current += 1;
    setLoading(false);
    setHappy(true);
    addChatMessage("nemo", CLOSING_MESSAGE);
  }

  const matches = result
    ? clinics
        .filter((clinic) => !clinic.isDemo && result.specialtyIds.includes(clinic.specialtyId))
        .map((clinic) => ({
          clinic,
          distance:
            clinic.lat != null && clinic.lng != null
              ? distanceKm(loc, { lat: clinic.lat, lng: clinic.lng })
              : clinic.distanceKm,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 6)
    : [];

  const nearestHospital = hospitals
    .map((hospital) => ({
      hospital,
      distance: distanceKm(loc, { lat: Number(hospital.lat), lng: Number(hospital.lng) }),
    }))
    .sort((a, b) => a.distance - b.distance)[0];
  const hospitalMatches = result
    ? (() => {
        const withDistance = hospitals.map((hospital) => ({
          hospital,
          distance: distanceKm(loc, { lat: Number(hospital.lat), lng: Number(hospital.lng) }),
        }));
        const byDepartment = withDistance.filter((item) =>
          hospitalMatchesSpecialty(item.hospital, result.specialtyIds),
        );
        const sameGovernorate = withDistance.filter(
          (item) => loc.city && item.hospital.governorate.includes(loc.city),
        );
        const pool =
          byDepartment.length > 0
            ? byDepartment
            : sameGovernorate.length > 0
              ? sameGovernorate
              : withDistance;
        return pool.sort((a, b) => a.distance - b.distance).slice(0, 6);
      })()
    : [];

  const urgent =
    imageUrgent || (painLevel !== null && painLevel >= 8) || result?.urgency === "emergency";
  const lastPatientMessage =
    [...chatMessages].reverse().find((message) => message.role === "patient")?.text ?? "";
  const hasPatientMessages = chatMessages.some((message) => message.role === "patient");
  const normalizedContext = lastPatientMessage.toLowerCase();
  const mentionsPain = /ألم|الم|وجع|وجعني|بتوجع|بيوجع|بيوجعني|صداع|مغص|حرقان|تعب/.test(
    normalizedContext,
  );
  const mentionsMedication = /روشت|دواء|ادويه|أدوية|حبوب|قرص|علاج/.test(normalizedContext);
  const mentionsLab =
    /تحليل|تحاليل|نتيجه التحليل|نتيجة التحليل|هيموجلوبين|صفائح|بوتاسيوم|صوديوم/.test(
      normalizedContext,
    );
  const mentionsAnxiety = /قلق|متوتر|توتر|خايف|خايفه|خوف|مضغوط|مش مرتاح/.test(normalizedContext);
  const hasSymptomResult =
    !!result &&
    result.urgency !== "emergency" &&
    !result.summary.startsWith("مش قادر أحدد التخصص") &&
    !mentionsMedication &&
    !mentionsLab &&
    !mentionsAnxiety &&
    !urgent;
  const showCareRecommendations = !!result && (hasSymptomResult || result.urgency === "emergency");
  const nearestClinic = matches[0];
  const relevantHospital = hospitalMatches[0] ?? nearestHospital;

  return {
    need,
    setNeed,
    loc,
    setLoc,
    picker,
    setPicker,
    analyzingImage,
    loading,
    happy,
    speaking,
    listening,
    handsFree,
    muted,
    senior,
    painLevel,
    painScaleDismissed,
    chatMessages,
    speakingMessageId,
    result,
    urgent,
    mentionsPain,
    mentionsMedication,
    mentionsLab,
    mentionsAnxiety,
    hasPatientMessages,
    showCareRecommendations,
    nearestClinic,
    relevantHospital,
    selfHarmFlag,
    chatContainerRef,
    chatEndRef,
    cameraInputRef,
    galleryInputRef,
    consent,
    toggleListening,
    playNemoMessage,
    selectPain,
    setPainScaleDismissed,
    submit,
    analyzeMedicalImage,
    finishSession,
  };
}
