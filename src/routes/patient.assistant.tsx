import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { applyBaymaxVoice, cleanForSpeech, isSeniorModeOn, setSeniorMode } from "@/lib/voice";
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
import { getLocalNemoReply, runLocalTriage, type TriageResult } from "@/lib/triage-local";
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
import {
  finalNemoTranscript,
  isNemoSessionComplete,
  shouldResumeNemo,
} from "@/lib/nemo-conversation";
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
const CLOSING_MESSAGE = "سعيد برضاك وعافيتك يا غالي، أنا سند لك دائماً، وأتمنى لك يوماً هادئاً.";

function nemoSpeechText(text: string) {
  return cleanForSpeech(text)
    .replace(/[.,:;\-–—]+/g, "،")
    .replace(/،\s*،+/g, "،")
    .replace(/\s{2,}/g, " ")
    .trim();
}
const examples = [
  "سناني بتوجعني ولثتي وارمة",
  "ابني عنده سخونية وكحة من يومين",
  "ركبتي بتوجعني لما بطلع السلم",
];
const BREATH_CYCLE_SECONDS = 19;

type ChatMessage = { id: number; role: "patient" | "nemo"; text: string; image?: string };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((e: {
        results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
      }) => void)
    | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
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
    applyBaymaxVoice(utterance);
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
      className={`nemo-breathe relative mx-auto grid h-16 w-20 place-items-center rounded-[46%_46%_43%_43%] border border-cyan-100 bg-gradient-to-b from-white via-white to-cyan-50 shadow-[0_12px_28px_-16px_rgba(14,116,144,0.42)] transition-shadow duration-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-default ${
        speaking ? "nemo-speaking-glow" : ""
      } ${emergency ? "nemo-emergency-flash shadow-[0_0_48px_-12px_rgba(251,146,60,0.5)]" : ""}`}
    >
      <NemoFaceSvg happy={happy} className="h-full w-full" />
      {speaking && (
        <span className="absolute -bottom-2 flex items-center gap-1" aria-hidden="true">
          <span className="h-1 w-1 animate-ping rounded-full bg-cyan-400" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-sky-300" />
          <span className="h-1 w-1 animate-ping rounded-full bg-teal-300 [animation-delay:250ms]" />
        </span>
      )}
    </button>
  );
}

function Assistant() {
  const navigate = useNavigate();
  const router = useRouter();
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
  const [listening, setListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [painScaleDismissed, setPainScaleDismissed] = useState(false);
  const [happy, setHappy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, role: "nemo", text: GREETING_DISPLAY },
  ]);
  const [breathing, setBreathing] = useState(false);
  const [breathElapsed, setBreathElapsed] = useState(0);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(1);
  const navigationTimerRef = useRef<number | null>(null);
  const providerWarningShownRef = useRef(false);
  const handsFreeRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [senior, setSenior] = useState(isSeniorModeOn());

  useEffect(() => {
    const syncSenior = () => setSenior(isSeniorModeOn());
    window.addEventListener("sanad:senior-mode", syncSenior);
    window.addEventListener("storage", syncSenior);
    return () => {
      window.removeEventListener("sanad:senior-mode", syncSenior);
      window.removeEventListener("storage", syncSenior);
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const pauseWhenHidden = () => {
      if (document.hidden) {
        disableHandsFree();
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
      stopRecognition();
      stopSpeechRef.current?.();
      document.removeEventListener("visibilitychange", pauseWhenHidden);
      if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!shouldResumeNemo({ enabled: handsFree, listening, speaking, loading, complete: happy }))
      return;
    const timer = window.setTimeout(() => {
      if (mountedRef.current && handsFreeRef.current && !document.hidden) startListening();
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
    stopRecognition();
    setListening(false);
    stopSpeechRef.current?.();
    setSpeakingMessageId(message.id);
    setSpeaking(true);
    stopSpeechRef.current = speakArabic(message.text, (success) => {
      if (!mountedRef.current) return;
      if (!success) disableHandsFree();
      setSpeaking(false);
      setSpeakingMessageId(null);
      stopSpeechRef.current = null;
    });
  }

  function addChatMessage(role: ChatMessage["role"], text: string) {
    messageIdRef.current += 1;
    const id = messageIdRef.current;
    setChatMessages((messages) => [...messages, { id, role, text }]);
    // Like Baymax, Nemo always speaks every reply aloud automatically.
    if (role === "nemo") {
      stopRecognition();
      setListening(false);
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

    stopRecognition();
    setListening(false);
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

  function stopRecognition() {
    const recognition = recogRef.current;
    recogRef.current = null;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    try {
      recognition.stop();
    } catch {
      /* Already stopped. */
    }
  }

  function disableHandsFree() {
    handsFreeRef.current = false;
    setHandsFree(false);
    stopRecognition();
    setListening(false);
  }

  function toggleListening() {
    if (handsFreeRef.current) {
      disableHandsFree();
      return;
    }
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
    if (recogRef.current || !handsFreeRef.current || !mountedRef.current || document.hidden) return;
    const Constructor = getSpeechRecognition();
    if (!Constructor) {
      disableHandsFree();
      toast.error("الإدخال الصوتي مش مدعوم في المتصفح ده — جرّب كروم أو سفاري");
      return;
    }
    try {
      const recognition = new Constructor();
      recognition.lang = "ar-EG";
      recognition.interimResults = true;
      recognition.continuous = false;
      let finalText = "";
      recognition.onresult = (event) => {
        if (recogRef.current !== recognition) return;
        finalText = finalNemoTranscript(event.results);
        setNeed(finalText);
        if (finalText.length >= 3) recognition.stop();
      };
      recognition.onerror = (event) => {
        if (recogRef.current !== recognition) return;
        if (event.error === "no-speech") return;
        disableHandsFree();
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("المايكروفون مرفوض — اسمح بالوصول للمايك من إعدادات المتصفح");
        } else if (event.error !== "aborted") {
          toast.error("مش قادر أسمعك دلوقتي — جرّب تاني");
        }
      };
      recognition.onend = () => {
        if (recogRef.current !== recognition || !mountedRef.current) return;
        setListening(false);
        recogRef.current = null;
        if (finalText.length >= 3) {
          setNeed(finalText);
          void submitRef.current(finalText);
        }
      };
      recogRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (recognitionError) {
      disableHandsFree();
      console.error("[Nemo] Could not start speech recognition", recognitionError);
      toast.error("تعذّر تشغيل المايكروفون على الجهاز ده");
    }
  }

  async function submit(text: string) {
    const query = text.trim();
    if (query.length < 3 || loading) return;
    if (isNemoSessionComplete(query)) {
      addChatMessage("patient", query);
      finishSession();
      return;
    }
    stopRecognition();
    setListening(false);
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
    const localTriage = runLocalTriage(query);
    setResult(localTriage);

    if (localTriage.urgency === "emergency") {
      const emergencyReply =
        "ألف سلامة عليك يا غالي، الأعراض دي محتاجة مساعدة عاجلة، اتصل بالإسعاف 123 أو توجّه لأقرب طوارئ الآن. لو تقدر من غير تأخير، قل لي مكان الألم وهل عندك أعراض تانية.";
      addChatMessage("nemo", emergencyReply);
      setLoading(false);
      return;
    }

    try {
      const response = await voiceAssist({
        data: {
          text: query,
          lat: loc.lat,
          lng: loc.lng,
          history: chatMessages.slice(-8).map((message) => ({
            role: message.role === "patient" ? ("user" as const) : ("assistant" as const),
            content: message.text,
          })),
        },
      });
      if (!mountedRef.current || requestRef.current !== requestId) return;
      const reply = (response.ai ? response.reply : getLocalNemoReply(query, localTriage)).trim();
      if (!reply) throw new Error("Nemo returned an empty reply");
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
    const navigateBack = () => {
      if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
      else void navigate({ to: "/patient" });
    };
    if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
    navigationTimerRef.current = window.setTimeout(navigateBack, 12_000);
  }

  const matches = result
    ? clinics
        .filter((clinic) => result.specialtyIds.includes(clinic.specialtyId))
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
        className="ios-scroll mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-3 overflow-y-auto pb-28 text-slate-800"
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
        <section className="order-1 flex shrink-0 items-center gap-3 overflow-hidden rounded-3xl border border-border/40 bg-card/75 bg-gradient-to-l from-sky-50/90 via-white/85 to-white/80 px-3 py-2 shadow-[0_12px_35px_-24px_rgba(14,116,144,0.5)] backdrop-blur-xl">
          <div className="relative shrink-0">
            <span
              className={`absolute -inset-2 rounded-full bg-cyan-200/50 blur-lg ${speaking || listening ? "opacity-100" : "opacity-30"} transition-opacity duration-700`}
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
              <h2 className="truncate text-base font-extrabold text-slate-800">
                نيمو، رفيقك الصحي
              </h2>
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-600" aria-hidden="true" />
            </div>
            <p className="mt-1 truncate text-xs leading-5 text-slate-600" aria-live="polite">
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
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 ${
              senior
                ? "border-amber-300 bg-amber-100 text-amber-900"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span aria-hidden="true">👵</span>
          </button>
          <span className="sr-only" aria-live="polite">
            {senior ? "وضع كبار السن مُفعّل" : "وضع كبار السن متوقف"}
          </span>
        </section>

        <section
          aria-label="محادثتك مع نيمو"
          aria-live="polite"
          className="order-2 flex-auto space-y-3 rounded-3xl border border-border/40 bg-card/75 p-4 shadow-sm backdrop-blur-xl"
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
                    ? "rounded-tr-md bg-slate-100 text-slate-800"
                    : "rounded-tl-md border border-cyan-100 bg-cyan-50 text-cyan-950"
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
                  <span className="mb-1 block text-[10px] font-extrabold text-cyan-800">
                    نيمو 🫧
                  </span>
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
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 ${
                    speaking && speakingMessageId === message.id
                      ? "bg-cyan-700 text-white"
                      : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
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
              <p className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {analyzingImage ? "نيمو بيحلل الصورة…" : "نيمو بيدوّر على التخصص المناسب"}
              </p>
            </div>
          )}
        </section>

        {(mentionsPain || painLevel !== null) && !painScaleDismissed && (
          <section className="order-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800">مقياس شدة الألم</h3>
                <p className="mt-1 text-xs text-slate-500">من 1 (خفيف) إلى 10 (شديد)</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPainScaleDismissed(true)}
                  aria-label="إغلاق مقياس الألم"
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                >
                  ✕ إغلاق
                </button>
                <HeartPulse className={`h-6 w-6 ${urgent ? "text-rose-600" : "text-cyan-700"}`} />
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
                    className={`grid h-10 place-items-center rounded-xl border text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-600 ${tone} ${
                      critical ? "motion-safe:animate-pulse" : ""
                    } ${painLevel === level ? "ring-2 ring-slate-700 ring-offset-1" : ""}`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-semibold">
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
                className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800 transition active:scale-95 hover:bg-cyan-100"
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
          className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] order-3 mx-auto w-auto max-w-xl rounded-2xl border border-border/40 bg-card/75 p-2 shadow-lg backdrop-blur-xl md:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
        >
          <div className="flex items-center gap-2">
            <input
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              maxLength={800}
              aria-label="اكتب رسالتك لنيمو"
              placeholder={listening ? "نيمو بيسمعك… اتكلم براحتك" : "اكتب رسالتك لنيمو…"}
              className={`min-w-0 flex-1 rounded-xl border bg-white px-3 text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${
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
              className={`shrink-0 place-items-center rounded-xl bg-cyan-700 text-white transition hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 ${
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
            className="order-5 rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
            aria-live="polite"
          >
            <p className="text-xs font-semibold text-slate-500">
              {urgent ? "مساعدة طبية قريبة" : "مساعدة قريبة حسب كلامك"}
            </p>
            {!urgent && (
              <p className="mt-1 font-extrabold text-cyan-950">
                التخصص المقترح: {getSpecialty(result.specialtyIds[0])?.name ?? "طب الأسرة"}
              </p>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {!urgent && nearestClinic && (
                <Link
                  to="/patient/clinic/$id"
                  params={{ id: nearestClinic.clinic.id }}
                  className="rounded-xl bg-cyan-50 px-3 py-2.5 text-xs font-bold text-cyan-950 hover:bg-cyan-100"
                >
                  أقرب عيادة: {nearestClinic.clinic.doctor} · {nearestClinic.distance.toFixed(1)} كم
                </Link>
              )}
              {!urgent && !nearestClinic && (
                <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  لا توجد عيادة مناسبة متاحة حالياً
                </p>
              )}
              {relevantHospital ? (
                <Link
                  to="/hospital/$id"
                  params={{ id: relevantHospital.hospital.id }}
                  className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  أقرب مستشفى: {relevantHospital.hospital.name} ·{" "}
                  {relevantHospital.distance.toFixed(1)} كم
                </Link>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  بيانات المستشفيات غير متاحة حالياً
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4 text-cyan-700" /> تغيير موقعي
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
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs font-bold text-cyan-950"
              >
                <HeartPulse className="h-4 w-4" /> قراءة التحاليل
              </Link>
            )}
          </section>
        )}

        {!urgent && <NemoBreathingCard />}

        {(urgent || (painLevel !== null && painLevel >= 8)) && (
          <section
            className="nemo-emergency order-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-600 text-white">
                <Siren className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-rose-900">
                  سلامتك أهم حاجة — اطلب مساعدة طبية عاجلة
                </h3>
                <p className="mt-1 text-xs leading-6 text-rose-800">
                  لو الألم شديد أو عندك ألم صدر أو صعوبة تنفس أو نزيف، اتصل بالإسعاف فوراً.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="tel:123"
                className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-700"
              >
                <Phone className="h-4 w-4" /> اتصل بالإسعاف 123
              </a>
            </div>
          </section>
        )}

        <section className="hidden">
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-cyan-700" />
            <h3 className="font-extrabold text-slate-800">احكيلي إيه اللي حاسس بيه</h3>
          </div>
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="mb-3 flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
          >
            <MapPin className="h-4 w-4 text-cyan-700" />
            <span className="flex-1 text-start">
              {loc.name}، {loc.city}
            </span>
            <span className="font-bold text-cyan-800">تغيير</span>
          </button>
          <div className="relative">
            <textarea
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              maxLength={800}
              rows={4}
              placeholder={
                listening
                  ? "نيمو بيسمعك… اتكلم براحتك"
                  : "اكتب الأعراض ومكان الألم أو احكيهم بصوتك…"
              }
              className={`w-full resize-none rounded-2xl border bg-white p-4 pe-14 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${
                listening ? "border-rose-400" : "border-slate-200"
              }`}
            />
            <button
              type="button"
              onClick={() => {
                if (speaking) {
                  stopSpeechRef.current?.();
                  stopSpeechRef.current = null;
                  setSpeaking(false);
                  setSpeakingMessageId(null);
                }
                toggleListening();
              }}
              aria-label={listening ? "إيقاف التسجيل" : "التحدث مع نيمو"}
              className={`absolute bottom-3 end-3 grid h-10 w-10 place-items-center rounded-full transition ${
                listening
                  ? "animate-pulse bg-rose-600 text-white shadow-[0_0_0_6px_rgba(244,63,94,0.15)]"
                  : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
              }`}
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {listening && (
              <span
                className="pointer-events-none absolute bottom-3 start-4 flex items-end gap-1"
                aria-label="جاري الاستماع"
              >
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={index}
                    className="w-1 animate-pulse rounded-full bg-rose-500"
                    style={{
                      height: `${8 + ((index * 7) % 14)}px`,
                      animationDelay: `${index * 0.12}s`,
                    }}
                  />
                ))}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setNeed(example)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50"
              >
                {example}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void submit(need)}
            disabled={loading || need.trim().length < 3}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-700 py-3.5 text-sm font-extrabold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> نيمو بيفهم كلامك…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> ساعدني ألاقي التخصص المناسب
              </>
            )}
          </button>
        </section>

        {mentionsAnxiety && (
          <section className="order-6 rounded-3xl border border-sky-100 bg-sky-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800">محتاج أهدى شوية؟</h3>
                <p className="mt-1 text-xs text-slate-600">جرّب تمرين التنفس 4–7–8 براحتك</p>
              </div>
              <Wind className="h-6 w-6 text-cyan-700" />
            </div>
            {breathing && (
              <div className="my-5 flex flex-col items-center gap-3" aria-live="polite">
                <div className="nemo-breath-halo grid h-36 w-36 place-items-center rounded-full bg-gradient-to-br from-cyan-100 to-sky-200">
                  <div
                    className={`nemo-breath-orb nemo-breath-${breathPhase} grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-[0_8px_30px_rgba(14,116,144,0.2)]`}
                  >
                    <span className="text-xs font-bold text-cyan-900">
                      {breathPhase === "inhale"
                        ? "خد شهيق"
                        : breathPhase === "hold"
                          ? "اثبت بهدوء"
                          : "طلّع النفس"}
                      <span className="mt-1 block text-lg">{breathRemaining}</span>
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-600">شهيق 4 ثوانٍ • ثبات 7 • زفير 8</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setBreathElapsed(0);
                setBreathing((active) => !active);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200 bg-white px-4 py-3 text-sm font-bold text-cyan-900 transition hover:bg-cyan-100"
            >
              <Wind className="h-4 w-4" /> {breathing ? "إيقاف تمرين التنفس" : "محتاج أهدى شوية 🧘"}
            </button>
          </section>
        )}

        {result && (
          <section className="hidden" aria-live="polite">
            {result.urgency === "emergency" && (
              <a
                href="tel:123"
                className="flex items-center gap-3 rounded-2xl bg-rose-600 p-4 font-bold text-white"
              >
                <Siren className="h-6 w-6 shrink-0" /> الأعراض دي ممكن تكون طارئة — اتصل بالإسعاف
                123 فوراً
              </a>
            )}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-6 text-slate-700">{result.summary}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (speaking) {
                      stopSpeechRef.current?.();
                      setSpeaking(false);
                      return;
                    }
                    const names = result.specialtyIds
                      .map((id) => getSpecialty(id)?.name ?? id)
                      .join("، ");
                    playNemoMessage({
                      id: -1,
                      role: "nemo",
                      text: [result.summary, names && `التخصصات المناسبة: ${names}.`, result.advice]
                        .filter(Boolean)
                        .join(" "),
                    });
                  }}
                  aria-label={speaking ? "إيقاف الاستماع" : "استماع للنتيجة"}
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
                    speaking
                      ? "animate-pulse bg-cyan-700 text-white"
                      : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
                  }`}
                >
                  {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.specialtyIds.map((id) => {
                  const Icon = specialtyIcons[id] ?? Stethoscope;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-sm font-bold text-cyan-900"
                    >
                      <Icon className="h-4 w-4" /> {getSpecialty(id)?.name ?? id}
                    </span>
                  );
                })}
                {result.urgency === "soon" && (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                    يُفضّل الكشف خلال يوم أو يومين
                  </span>
                )}
              </div>
              {result.advice && (
                <p className="mt-3 flex gap-1.5 text-xs leading-5 text-slate-600">
                  <Lightbulb className="h-4 w-4 shrink-0 text-cyan-700" /> {result.advice}
                </p>
              )}
            </div>

            <h3 className="px-1 font-extrabold text-slate-800">عيادات مناسبة قريبة منك</h3>
            {matches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm leading-6 text-slate-600">
                لسه مفيش عيادات خاصة مسجّلة في التخصص ده — شوف أقرب المستشفيات الحكومية تحت.
              </div>
            )}
            {matches.map(({ clinic, distance }) => (
              <div
                key={clinic.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{clinic.doctor}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getSpecialty(clinic.specialtyId)?.name} • {distance.toFixed(1)} كم •{" "}
                    <Star className="inline h-3 w-3" /> {clinic.rating}
                  </p>
                </div>
                {clinic.phone && (
                  <a
                    href={`tel:${clinic.phone}`}
                    aria-label="اتصال بالعيادة"
                    className="rounded-full bg-cyan-50 p-2 text-cyan-800"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                <Link
                  to="/patient/clinic/$id"
                  params={{ id: clinic.id }}
                  className="flex items-center text-sm font-bold text-cyan-800"
                >
                  عرض <ChevronLeft className="h-4 w-4" />
                </Link>
              </div>
            ))}

            {hospitalMatches.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="flex items-center gap-2 font-extrabold text-slate-800">
                  <Hospital className="h-5 w-5 text-rose-600" /> مستشفيات حكومية قريبة منك
                </h3>
                {hospitalMatches.map(({ hospital, distance }) => (
                  <div
                    key={hospital.id}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/hospital/$id"
                          params={{ id: hospital.id }}
                          className="block truncate font-bold text-slate-800 hover:text-cyan-800"
                        >
                          {hospital.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {hospital.governorate}
                          {hospital.district ? ` • ${hospital.district}` : ""} •{" "}
                          {distance.toFixed(1)} كم
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                            {HOSPITAL_TYPES[hospital.hospital_type] ?? "مستشفى حكومي"}
                          </span>
                          {hospital.emergency_24h && (
                            <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white">
                              طوارئ 24 ساعة
                            </span>
                          )}
                          {hospital.has_icu && (
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] text-sky-800">
                              رعاية مركزة
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {hospital.phone && (
                          <a
                            href={`tel:${hospital.phone}`}
                            aria-label="اتصال بالمستشفى"
                            className="rounded-full bg-cyan-50 p-2 text-cyan-800"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={hospitalMapsUrl(hospital)}
                          aria-label="الاتجاهات على الخريطة"
                          className="rounded-full bg-cyan-50 p-2 text-cyan-800"
                        >
                          <Navigation className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {hasPatientMessages && (
          <>
            <button
              type="button"
              onClick={finishSession}
              disabled={happy}
              className="order-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-100 bg-white px-4 py-3.5 text-sm font-extrabold text-cyan-950 shadow-[0_8px_28px_rgba(14,116,144,0.15)] transition hover:bg-cyan-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-700 disabled:cursor-wait disabled:opacity-70"
            >
              <Check className="h-4 w-4 text-cyan-700" />{" "}
              {happy ? "سعيد برضاك وعافيتك يا غالي 🤍" : "أنا راضٍ عن خدمتك الصحية 🤍"}
            </button>
            <p className="order-9 text-center text-[11px] leading-5 text-slate-500">
              نيمو للإرشاد فقط ولا يغني عن استشارة الطبيب. لو في طارئ اتصل بالإسعاف 123.
            </p>
          </>
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
