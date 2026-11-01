import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Check,
  ChevronLeft,
  HeartPulse,
  Hospital,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Phone,
  Pill,
  Camera as CameraIcon,
  Send,
  Siren,
  Sparkles,
  Square,
  Star,
  Stethoscope,
  Volume2,
  VolumeX,
  Wind,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyNemoVoice,
  cleanForSpeech,
  getVoiceSessionKey,
  getBestFemaleArabicVoice,
  isVoiceMuted,
  isSeniorModeOn,
  setVoiceMuted,
  setSeniorMode,
  speak as speakVoice,
} from "@/lib/voice";
import { AppShell } from "@/components/AppShell";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { NemoFaceSvg } from "@/components/NemoFaceSvg";
import { NemoBreathingCard } from "@/components/NemoBreathingCard";
import {
  getPatientLocation,
  savePatientLocation,
  distanceKm,
  defaultLocation,
  type PatientLocation,
} from "@/lib/patient-location";
import { getVerifiedClinics, getSpecialty, type Clinic } from "@/lib/mock-data";
import { specialtyIcons } from "@/lib/specialty-icons";
import {
  getLocalNemoReply,
  mergeTriageUrgency,
  replyMentionsEmergency,
  runLocalTriage,
  type TriageResult,
} from "@/lib/triage-local";
import { voiceAssist } from "@/lib/voice-assist.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAiConsent, aiErrorMessage } from "@/components/AiConsentDialog";
import { readLab, scanDrug } from "@/lib/medscan.functions";
import { imageToBase64 } from "@/lib/image-to-base64";
import { isNemoSessionComplete, shouldResumeNemo } from "@/lib/nemo-conversation";
import { useNemoSpeechInput } from "@/hooks/use-nemo-speech-input";
import {
  listHospitals,
  HOSPITAL_TYPES,
  hospitalMapsUrl,
  type Hospital as HospitalRow,
} from "@/lib/hospitals.functions";

export const Route = createFileRoute("/patient/assistant")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سند — نيمو رفيق الرعاية الصحية" },
      {
        name: "description",
        content: "تحدث مع نيمو، رفيقك الصحي، واكتشف التخصص والعيادة المناسبة.",
      },
      { property: "og:title", content: "سند — نيمو رفيق الرعاية الصحية" },
      {
        property: "og:description",
        content: "رفيق صحي ودود يساعدك على فهم الأعراض والعثور على الرعاية المناسبة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const GREETING_DISPLAY = "مرحباً، أنا نيمو، رفيقك الشخصي للرعاية الصحية. كيف تشعر اليوم؟";
const CLOSING_MESSAGE = "انتهت محادثتنا. أتمنى لك السلامة، ونيمو موجود لمساعدتك وقت ما تحتاج.";

function nemoSpeechText(text: string) {
  return cleanForSpeech(text)
    .replace(/[.,:;\-–—]+/g, "،")
    .replace(/،\s*،+/g, "،")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const BREATH_CYCLE_SECONDS = 19;

type ChatMessage = { id: number; role: "patient" | "nemo"; text: string; image?: string };

function speakArabic(text: string, onEnd: (success: boolean) => void): () => void {
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

function hospitalMatchesSpecialty(hospital: HospitalRow, specialtyIds: string[]): boolean {
  const departments = (hospital.departments ?? []).join(" ");
  if (!departments) return false;
  return specialtyIds.some((id) => {
    const keywords: Record<string, string[]> = {
      pediatrics: ["أطفال", "اطفال", "صدرية أطفال"],
      neonatology: ["حديثي الولادة", "أطفال", "حضانات"],
      dental: ["أسنان", "اسنان", "فم"],
      ophthalmology: ["عيون", "رمد"],
      ent: ["أنف", "انف", "أذن", "حنجرة", "سمعيات"],
      orthopedics: ["عظام", "كسور", "مفاصل"],
      dermatology: ["جلدية", "تناسلية"],
      gynecology: ["نساء", "توليد", "ولادة"],
      cardiology: ["قلب", "أوعية دموية"],
      neurology: ["مخ", "أعصاب", "اعصاب"],
      "internal-medicine": ["باطنة", "باطني"],
      general: ["باطنة", "عام", "طوارئ"],
      urology: ["مسالك", "كلى", "كلي"],
      psychiatry: ["نفسي", "عصبي"],
      physiotherapy: ["علاج طبيعي", "تأهيل"],
      nutrition: ["تغذية"],
      "family-medicine": ["أسرة", "عام"],
    };
    return (keywords[id] ?? [getSpecialty(id)?.name ?? ""]).some((keyword) =>
      keyword ? departments.includes(keyword) : false,
    );
  });
}

function NemoFace({
  speaking,
  emergency,
  happy,
  listening,
  onActivate,
}: {
  speaking: boolean;
  emergency: boolean;
  happy: boolean;
  listening: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={happy}
      aria-pressed={listening}
      aria-label={listening ? "إيقاف استماع نيمو" : "اضغط للتحدث مع نيمو"}
      title={listening ? "إيقاف استماع نيمو" : "اضغط للتحدث مع نيمو"}
      className={`nemo-breathe relative mx-auto grid h-16 w-20 place-items-center rounded-[46%_46%_43%_43%] border border-primary/20 bg-gradient-to-b from-card via-card to-primary/10 shadow-soft transition-shadow duration-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default ${
        speaking ? "nemo-speaking-glow" : ""
      } ${emergency ? "nemo-emergency-flash shadow-[0_0_48px_-12px_rgba(251,146,60,0.5)]" : ""}`}
    >
      <NemoFaceSvg happy={happy} className="h-full w-full" />
      {speaking && (
        <span className="absolute -bottom-2 flex items-center gap-1" aria-hidden="true">
          <span className="h-1 w-1 animate-ping rounded-full bg-primary" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-primary/60" />
          <span className="h-1 w-1 animate-ping rounded-full bg-primary [animation-delay:250ms]" />
        </span>
      )}
    </button>
  );
}

function Assistant() {
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
  const [rating, setRating] = useState<"positive" | "negative" | null>(null);
  const [muted, setMuted] = useState(isVoiceMuted());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, role: "nemo", text: GREETING_DISPLAY },
  ]);
  const [breathing, setBreathing] = useState(false);
  const [breathElapsed, setBreathElapsed] = useState(0);
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
    if (!breathing) return;
    const timer = window.setInterval(
      () => setBreathElapsed((elapsed) => (elapsed + 1) % BREATH_CYCLE_SECONDS),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [breathing]);

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
      const report = await readLab({ data: { image: data, mime } });
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

      const drug = await scanDrug({ data: { image: data, mime } });
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
        drug.uses ? drug.uses : "",
        drug.warnings ? `ملاحظة مهمة: ${drug.warnings}.` : "",
        "ده شرح للصورة فقط، ماتبدأش الدواء أو تغيّر جرعته من غير مراجعة الطبيب أو الصيدلي.",
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
    setBreathing(false);
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
    setBreathing(false);
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

  const breathPhase = breathElapsed < 4 ? "inhale" : breathElapsed < 11 ? "hold" : "exhale";
  const breathRemaining =
    breathPhase === "inhale"
      ? 4 - breathElapsed
      : breathPhase === "hold"
        ? 11 - breathElapsed
        : BREATH_CYCLE_SECONDS - breathElapsed;
  return (
    <AppShell
      title="نيمو | رفيق الرعاية الصحية"
      subtitle="أنا هنا أسمعك وأساعدك بهدوء"
      backTo="/patient"
      tone="light"
      fullHeight
    >
      <div
        ref={chatContainerRef}
        className="ios-scroll mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3 overflow-y-auto pb-28 text-foreground"
      >
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void analyzeMedicalImage(file);
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void analyzeMedicalImage(file);
          }}
        />
        <section className="order-1 flex shrink-0 items-center gap-3 overflow-hidden rounded-3xl border border-primary/20 bg-card/85 bg-gradient-to-l from-primary/10 via-card/90 to-card/85 px-3 py-2 shadow-soft backdrop-blur-xl">
          <div className="relative shrink-0">
            <span
              className={`absolute -inset-2 rounded-full bg-primary/20 blur-lg ${speaking || listening ? "opacity-100" : "opacity-30"} transition-opacity duration-700`}
            />
            <NemoFace
              speaking={speaking || listening}
              listening={handsFree}
              emergency={urgent}
              happy={happy}
              onActivate={toggleListening}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-base font-extrabold text-foreground">
                نيمو، رفيقك الصحي
              </h2>
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-1 truncate text-xs leading-5 text-muted-foreground" aria-live="polite">
              {listening
                ? "نيمو بيسمعك… اتكلم براحتك"
                : speaking
                  ? "نيمو بيتكلم معاك بهدوء"
                  : "اضغط على نيمو للتحدث"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSeniorMode(!senior)}
            role="switch"
            aria-checked={senior}
            aria-label="وضع كبار السن — ردود صوتية تلقائية وأزرار أكبر"
            title="وضع كبار السن — ردود صوتية تلقائية وأزرار أكبر"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              senior
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-border bg-card text-muted-foreground hover:bg-secondary"
            }`}
          >
            <span aria-hidden="true">👵</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {senior ? "وضع كبار السن مُفعّل" : "وضع كبار السن متوقف"}
          </span>
          <button
            type="button"
            onClick={() => setVoiceMuted(!muted)}
            aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
            aria-pressed={muted}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-card text-foreground"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </section>
        <p className="order-1 -mt-2 px-2 text-xs leading-5 text-muted-foreground">
          نيمو للإرشاد فقط ولا يغني عن الطبيب. في الطوارئ اتصل بالإسعاف 123.
        </p>

        <section
          aria-label="محادثتك مع نيمو"
          aria-live="polite"
          className="order-2 flex-auto space-y-3 rounded-3xl border border-border bg-card p-4 shadow-sm"
        >
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`nemo-chat-message scroll-mb-36 flex items-end gap-2 ${message.role === "patient" ? "justify-start" : "justify-end"}`}
            >
              {message.role === "nemo" && (
                <NemoFaceSvg
                  className="h-9 w-11 shrink-0 drop-shadow-[0_1px_4px_rgba(34,211,238,0.25)]"
                  aria-hidden="true"
                />
              )}
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 leading-6 ${
                  senior ? "text-base" : "text-sm"
                } ${
                  message.role === "patient"
                    ? "rounded-tr-md bg-secondary text-foreground"
                    : "rounded-tl-md border border-primary/20 bg-primary/10 text-foreground"
                }`}
              >
                {message.image && (
                  <img
                    src={message.image}
                    alt="صورة أرسلها المريض لنيمو لتحليلها"
                    className="mb-2 max-h-48 max-w-full rounded-xl object-contain"
                  />
                )}
                {message.role === "nemo" && (
                  <span className="mb-1 block text-xs font-extrabold text-primary">نيمو 🫧</span>
                )}
                {message.text}
              </div>
              {message.role === "nemo" && (
                <button
                  type="button"
                  onClick={() => playNemoMessage(message)}
                  aria-label={
                    speaking && speakingMessageId === message.id
                      ? "إيقاف قراءة رسالة نيمو"
                      : "استمع إلى رسالة نيمو"
                  }
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    speaking && speakingMessageId === message.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary hover:bg-primary/15"
                  }`}
                >
                  {speaking && speakingMessageId === message.id ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <p className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-primary/10 px-3 py-2 text-xs text-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {analyzingImage ? "نيمو بيحلل الصورة…" : "نيمو بيدوّر على التخصص المناسب"}
              </p>
            </div>
          )}
        </section>

        {(mentionsPain || painLevel !== null) && !painScaleDismissed && (
          <section className="order-4 rounded-3xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-foreground">مقياس شدة الألم</h3>
                <p className="mt-1 text-xs text-muted-foreground">من 1 (خفيف) إلى 10 (شديد)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPainScaleDismissed(true)}
                  aria-label="إغلاق مقياس الألم"
                  className="min-h-11 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-bold text-foreground transition hover:bg-secondary/80"
                >
                  ✕ إغلاق
                </button>
                <HeartPulse className={`h-6 w-6 ${urgent ? "text-destructive" : "text-primary"}`} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2" dir="ltr">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => {
                const tone =
                  level <= 3
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : level <= 7
                      ? "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
                      : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100";
                const critical = level >= 8;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => selectPain(level)}
                    aria-pressed={painLevel === level}
                    aria-label={`شدة الألم ${level} من 10`}
                    className={`grid h-11 place-items-center rounded-xl border text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${tone} ${
                      critical ? "motion-safe:animate-pulse" : ""
                    } ${painLevel === level ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold">
              <span className="text-emerald-700">1–3 خفيف</span>
              <span className="text-orange-700">4–7 متوسط</span>
              <span className="text-rose-700">8–10 شديد</span>
            </div>
          </section>
        )}

        {painLevel !== null && painScaleDismissed && (
          <div className="order-4 flex justify-center">
            <button
              type="button"
              onClick={() => setPainScaleDismissed(false)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground shadow-sm transition hover:bg-secondary"
            >
              شدة الألم المسجلة: {painLevel}/10 • تعديل
            </button>
          </div>
        )}
        {!hasPatientMessages && !loading && (
          <div aria-label="أمثلة سريعة" className="order-3 flex flex-wrap justify-center gap-2">
            {[
              "عندي صداع جامد من الصبح",
              "بطني بتوجعني ومش قادر أنام",
              "عندي ضيق في التنفس",
              "محتاج أقرب مستشفى طوارئ",
            ].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void submit(example)}
                className="min-h-11 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold text-foreground transition active:scale-95 hover:bg-primary/15"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <form
          aria-label="أرسل رسالة إلى نيمو"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(need);
          }}
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] order-3 mx-auto w-auto max-w-xl rounded-2xl border border-border bg-card p-2 shadow-lg md:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center gap-2">
            <input
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              maxLength={800}
              aria-label="اكتب رسالتك لنيمو"
              placeholder={listening ? "نيمو بيسمعك… اتكلم براحتك" : "اكتب رسالتك لنيمو…"}
              className={`min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 ${
                senior ? "py-4 text-base" : "py-3 text-sm"
              } ${listening ? "border-rose-400" : "border-transparent"}`}
            />
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={happy || loading}
              aria-label="التقط صورة بالكاميرا لتحليلها مع نيمو"
              title="التقط صورة بالكاميرا لتحليلها مع نيمو"
              variant="secondary"
              className={`shrink-0 place-items-center rounded-lg p-0 ${
                senior ? "grid h-14 w-14" : "grid h-11 w-11"
              }`}
            >
              <CameraIcon className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={happy || loading}
              aria-label="اختار صورة من المعرض لتحليلها مع نيمو"
              title="اختار صورة من المعرض لتحليلها مع نيمو"
              variant="secondary"
              className={`shrink-0 place-items-center rounded-lg p-0 ${
                senior ? "grid h-14 w-14" : "grid h-11 w-11"
              }`}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              onClick={toggleListening}
              disabled={happy}
              aria-pressed={handsFree}
              aria-label={handsFree ? "إيقاف المحادثة الصوتية" : "التحدث مع نيمو"}
              title={handsFree ? "إيقاف المحادثة الصوتية" : "التحدث مع نيمو"}
              variant={handsFree ? "destructive" : "secondary"}
              className={`shrink-0 place-items-center rounded-lg p-0 ${
                senior ? "grid h-14 w-14" : "grid h-11 w-11"
              }`}
            >
              {handsFree ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <button
              type="submit"
              disabled={loading || need.trim().length < 3}
              aria-label="إرسال الرسالة"
              className={`shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                senior ? "grid h-14 w-14" : "grid h-11 w-11"
              }`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          {listening && (
            <p className="px-3 pb-1 text-xs font-semibold text-rose-700" aria-live="polite">
              جاري الاستماع…
            </p>
          )}
        </form>

        {showCareRecommendations && result && (
          <section
            className="order-5 rounded-2xl border border-border bg-card p-4 shadow-sm"
            aria-live="polite"
          >
            <p className="text-xs font-semibold text-muted-foreground">
              {urgent ? "مساعدة طبية قريبة" : "مساعدة قريبة حسب كلامك"}
            </p>
            {!urgent && (
              <p className="mt-1 font-extrabold text-foreground">
                التخصص المقترح: {getSpecialty(result.specialtyIds[0])?.name ?? "طب الأسرة"}
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {!urgent && nearestClinic && (
                <Link
                  to="/patient/clinic/$id"
                  params={{ id: nearestClinic.clinic.id }}
                  className="min-h-11 rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-bold text-foreground hover:bg-primary/15"
                >
                  أقرب عيادة: {nearestClinic.clinic.doctor} · {nearestClinic.distance.toFixed(1)} كم
                </Link>
              )}
              {!urgent && !nearestClinic && (
                <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                  لا توجد عيادة مناسبة متاحة حالياً
                </p>
              )}
              {relevantHospital ? (
                <Link
                  to="/hospital/$id"
                  params={{ id: relevantHospital.hospital.id }}
                  className="min-h-11 rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
                >
                  أقرب مستشفى: {relevantHospital.hospital.name} ·{" "}
                  {relevantHospital.distance.toFixed(1)} كم
                </Link>
              ) : (
                <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                  بيانات المستشفيات غير متاحة حالياً
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary"
            >
              <MapPin className="h-4 w-4 text-primary" /> تغيير موقعي
            </button>
          </section>
        )}

        {(mentionsMedication || mentionsLab) && (
          <section className="order-5 flex flex-wrap gap-2" aria-label="أدوات صحية مرتبطة بكلامك">
            {mentionsMedication && (
              <Link
                to="/patient/drug-scan"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-950"
              >
                <Pill className="h-4 w-4" /> فحص الدواء أو الروشتة
              </Link>
            )}
            {mentionsLab && (
              <Link
                to="/patient/lab-reader"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-bold text-foreground"
              >
                <HeartPulse className="h-4 w-4" /> قراءة التحاليل
              </Link>
            )}
          </section>
        )}

        {!urgent && <NemoBreathingCard />}

        {(urgent || (painLevel !== null && painLevel >= 8)) && (
          <section
            className="nemo-emergency order-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-destructive text-destructive-foreground">
                <Siren className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-destructive">
                  سلامتك أهم حاجة — اطلب مساعدة طبية عاجلة
                </h3>
                <p className="mt-1 text-xs leading-6 text-destructive">
                  لو الألم شديد أو عندك ألم صدر أو صعوبة تنفس أو نزيف، اتصل بالإسعاف فوراً.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="tel:123"
                className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-sm font-extrabold text-destructive-foreground transition hover:bg-destructive/90"
              >
                <Phone className="h-4 w-4" /> اتصل بالإسعاف 123
              </a>
            </div>
          </section>
        )}

        {mentionsAnxiety && (
          <section className="order-6 rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-foreground">محتاج أهدى شوية؟</h3>
                <p className="mt-1 text-xs text-muted-foreground">جرّب تمرين التنفس 4–7–8 براحتك</p>
              </div>
              <Wind className="h-6 w-6 text-primary" />
            </div>
            {breathing && (
              <div className="my-5 flex flex-col items-center gap-3" aria-live="polite">
                <div className="nemo-breath-halo grid h-36 w-36 place-items-center rounded-full bg-gradient-to-br from-primary/20 to-secondary">
                  <div
                    className={`nemo-breath-orb nemo-breath-${breathPhase} grid h-24 w-24 place-items-center rounded-full bg-card text-center shadow-soft`}
                  >
                    <span className="text-xs font-bold text-foreground">
                      {breathPhase === "inhale"
                        ? "خد شهيق"
                        : breathPhase === "hold"
                          ? "اثبت بهدوء"
                          : "طلّع النفس"}
                      <span className="mt-1 block text-lg">{breathRemaining}</span>
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">شهيق 4 ثوانٍ • ثبات 7 • زفير 8</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setBreathElapsed(0);
                setBreathing((active) => !active);
              }}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition hover:bg-secondary"
            >
              <Wind className="h-4 w-4" /> {breathing ? "إيقاف تمرين التنفس" : "محتاج أهدى شوية 🧘"}
            </button>
          </section>
        )}

        {hasPatientMessages && (
          <div className="order-8 space-y-3">
            {!happy ? (
              <button
                type="button"
                onClick={finishSession}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-extrabold text-foreground shadow-soft transition hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Check className="h-4 w-4 text-primary" />
                إنهاء المحادثة
              </button>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm font-bold text-foreground">انتهت المحادثة</p>
                <p className="mt-1 text-xs text-muted-foreground">هل كانت المساعدة مفيدة؟</p>
                <div className="mt-3 flex justify-center gap-3">
                  <button
                    type="button"
                    aria-label="تقييم إيجابي"
                    aria-pressed={rating === "positive"}
                    onClick={() => setRating("positive")}
                    className={`grid h-11 w-11 place-items-center rounded-full border ${rating === "positive" ? "border-success bg-success/15 text-success" : "border-border text-muted-foreground"}`}
                  >
                    <ThumbsUp className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="تقييم سلبي"
                    aria-pressed={rating === "negative"}
                    onClick={() => setRating("negative")}
                    className={`grid h-11 w-11 place-items-center rounded-full border ${rating === "negative" ? "border-destructive bg-destructive/15 text-destructive" : "border-border text-muted-foreground"}`}
                  >
                    <ThumbsDown className="h-5 w-5" />
                  </button>
                </div>
                {rating && <p className="mt-2 text-xs text-muted-foreground">شكراً على تقييمك.</p>}
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {consent.dialog}
      {picker && (
        <LocationPickerModal
          current={loc}
          onSelect={(location) => {
            savePatientLocation(location);
            setLoc(location);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </AppShell>
  );
}
