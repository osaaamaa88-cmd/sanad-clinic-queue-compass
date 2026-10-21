import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  HeartPulse,
  Hospital,
  Lightbulb,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Phone,
  Pill,
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
import { applyBaymaxVoice, cleanForSpeech } from "@/lib/voice";
import { isNative } from "@/lib/native";
import { AppShell } from "@/components/AppShell";
import { LocationPickerModal } from "@/components/LocationPickerModal";
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
      { title: "سَنَد — نيمو رفيق الرعاية الصحية" },
      {
        name: "description",
        content: "تحدث مع نيمو، رفيقك الصحي، واكتشف التخصص والعيادة المناسبة.",
      },
      { property: "og:title", content: "سَنَد — نيمو رفيق الرعاية الصحية" },
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

const GREETING_DISPLAY = "مرحباً، أنا نيمو، رفيقك الصحي. كيف أقدر أساعدك اليوم؟";
const CLOSING_MESSAGE = "سعيد برضاك وعافيتك يا غالي، أنا سند لك دائماً، وأتمنى لك يوماً هادئاً.";
const examples = [
  "سناني بتوجعني ولثتي وارمة",
  "ابني عنده سخونية وكحة من يومين",
  "ركبتي بتوجعني لما بطلع السلم",
];
const BREATH_CYCLE_SECONDS = 19;

type ChatMessage = { id: number; role: "patient" | "nemo"; text: string };

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
function speakArabic(text: string, onEnd: () => void): () => void {
  if (typeof window === "undefined") {
    toast.error("القراءة الصوتية مش مدعومة على الجهاز ده");
    onEnd();
    return () => {};
  }
  const spokenText = cleanForSpeech(text)
    .replace(/[.,:;\-–—]+/g, "،")
    .replace(/،\s*،+/g, "،")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (isNative()) {
    let cancelled = false;
    let stopNativeSpeech: (() => void) | null = null;
    void import("@capacitor-community/text-to-speech")
      .then(async ({ TextToSpeech, QueueStrategy }) => {
        if (cancelled) return;
        stopNativeSpeech = () => {
          void TextToSpeech.stop().catch((error: unknown) => {
            console.error("[Nemo] Could not stop native speech", error);
          });
        };
        await TextToSpeech.speak({
          text: spokenText,
          lang: "ar-EG",
          rate: 0.82,
          pitch: 1,
          volume: 1,
          queueStrategy: QueueStrategy.Flush,
        });
        if (!cancelled) onEnd();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("[Nemo] Native speech failed", error);
        toast.error("تعذّر تشغيل الصوت. تأكد من تفعيل خدمة تحويل النص إلى كلام في الجهاز.");
        onEnd();
      });
    return () => {
      cancelled = true;
      stopNativeSpeech?.();
    };
  }

  if (!("speechSynthesis" in window)) {
    toast.error("القراءة الصوتية مش مدعومة على الجهاز ده");
    onEnd();
    return () => {};
  }

  const synthesis = window.speechSynthesis;
  if (synthesis.speaking || synthesis.pending) synthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spokenText);
  applyBaymaxVoice(utterance);
  utterance.volume = 1;

  let cancelled = false;
  let started = false;
  let completed = false;
  const finish = () => {
    if (cancelled || completed) return;
    completed = true;
    window.clearTimeout(startTimer);
    onEnd();
  };
  const startTimer = window.setTimeout(() => {
    if (started || cancelled || completed) return;
    synthesis.cancel();
    toast.error("المتصفح لم يبدأ تشغيل الصوت. تحقق من مستوى الصوت أو جرّب متصفحاً آخر.");
    finish();
  }, 5000);
  utterance.onstart = () => {
    started = true;
    window.clearTimeout(startTimer);
  };
  utterance.onend = finish;
  utterance.onerror = (event) => {
    if (cancelled || completed) return;
    console.error("[Nemo] Browser speech failed", event.error);
    toast.error("تعذّر تشغيل الصوت في المتصفح. تحقق من إعدادات الصوت ثم حاول مجدداً.");
    finish();
  };
  synthesis.speak(utterance);
  return () => {
    cancelled = true;
    window.clearTimeout(startTimer);
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
}: {
  speaking: boolean;
  emergency: boolean;
  happy: boolean;
}) {
  return (
    <div
      className={`nemo-breathe relative mx-auto grid h-36 w-44 place-items-center rounded-[46%_46%_43%_43%] border border-cyan-100 bg-gradient-to-b from-white via-white to-cyan-50 shadow-[0_24px_55px_-24px_rgba(14,116,144,0.42)] transition-shadow duration-700 ${
        speaking ? "nemo-speaking-glow" : ""
      } ${emergency ? "nemo-emergency-flash shadow-[0_0_48px_-12px_rgba(251,146,60,0.5)]" : ""}`}
      role="img"
      aria-label={happy ? "نيمو يبتسم" : "وجه نيمو الودود"}
    >
      <span className="absolute -top-2 left-1/2 h-5 w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-100 via-white to-teal-100" />
      <span className="absolute left-7 top-1/2 h-5 w-4 -translate-y-1/2 rounded-full bg-cyan-100/80" />
      <span className="absolute right-7 top-1/2 h-5 w-4 -translate-y-1/2 rounded-full bg-cyan-100/80" />
      <span className="flex -translate-y-1 items-center gap-12">
        <span
          className={`nemo-eye h-[18px] w-[13px] rounded-full bg-slate-800 ${happy ? "nemo-eye-happy" : ""}`}
        />
        <span
          className={`nemo-eye h-[18px] w-[13px] rounded-full bg-slate-800 ${happy ? "nemo-eye-happy" : ""}`}
        />
      </span>
      <span
        className={`absolute top-[58%] h-3 w-7 rounded-b-full border-b-2 border-cyan-600 transition-transform ${happy ? "scale-125" : ""}`}
      />
      {speaking && (
        <span className="absolute -bottom-4 flex items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-teal-300 [animation-delay:250ms]" />
        </span>
      )}
    </div>
  );
}

function Assistant() {
  const navigate = useNavigate();
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [loc, setLoc] = useState<PatientLocation>(defaultLocation);
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [happy, setHappy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, role: "nemo", text: GREETING_DISPLAY },
  ]);
  const [breathing, setBreathing] = useState(false);
  const [breathElapsed, setBreathElapsed] = useState(0);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const chatContainerRef = useRef<HTMLElement>(null);
  const messageIdRef = useRef(1);
  const navigationTimerRef = useRef<number | null>(null);
  const providerWarningShownRef = useRef(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);

  useEffect(
    () => () => {
      recogRef.current?.stop();
      stopSpeechRef.current?.();
      if (navigationTimerRef.current !== null) window.clearTimeout(navigationTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const container = chatContainerRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
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
    stopSpeechRef.current?.();
    setSpeakingMessageId(message.id);
    setSpeaking(true);
    stopSpeechRef.current = speakArabic(message.text, () => {
      setSpeaking(false);
      setSpeakingMessageId(null);
      stopSpeechRef.current = null;
    });
  }

  function addChatMessage(role: ChatMessage["role"], text: string) {
    messageIdRef.current += 1;
    const id = messageIdRef.current;
    setChatMessages((messages) => [...messages, { id, role, text }]);
  }

  function toggleListening() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const Constructor = getSpeechRecognition();
    if (!Constructor) {
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
        let interimText = "";
        let nextFinalText = "";
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          if (result.isFinal) nextFinalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        finalText = `${finalText} ${nextFinalText}`.trim();
      };
      recognition.onerror = (event) => {
        setListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          toast.error("المايكروفون مرفوض — اسمح بالوصول للمايك من إعدادات المتصفح");
        } else if (event.error !== "aborted") {
          toast.error("مش قادر أسمعك دلوقتي — جرّب تاني");
        }
      };
      recognition.onend = () => {
        setListening(false);
        recogRef.current = null;
        if (finalText.length >= 3) {
          setNeed(finalText);
          void submit(finalText);
        }
      };
      recogRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch (recognitionError) {
      console.error("[Nemo] Could not start speech recognition", recognitionError);
      toast.error("تعذّر تشغيل المايكروفون على الجهاز ده");
    }
  }

  async function submit(text: string) {
    const query = text.trim();
    if (query.length < 3 || loading) return;
    stopSpeechRef.current?.();
    stopSpeechRef.current = null;
    setSpeaking(false);
    setSpeakingMessageId(null);
    setLoading(true);
    setNeed("");
    setBreathing(false);
    setPainLevel(null);
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
      const reply = (response.ai ? response.reply : getLocalNemoReply(query, localTriage)).trim();
      if (!reply) throw new Error("Nemo returned an empty reply");
      addChatMessage("nemo", reply);
      if (!response.ai && !providerWarningShownRef.current) {
        providerWarningShownRef.current = true;
        toast.warning("المساعد الذكي غير متاح حالياً، أقدّم لك توجيهاً أولياً حسب الأعراض.");
      }
    } catch (assistantError) {
      console.error("[Nemo] AI assistant unavailable; using a safe local reply", assistantError);
      const fallbackReply = getLocalNemoReply(query, localTriage);
      addChatMessage("nemo", fallbackReply);
      toast.warning("تعذر الاتصال بالمساعد الذكي الآن، أقدّم لك توجيهاً أولياً حسب الأعراض.");
    } finally {
      setLoading(false);
      // Removed automatic toggleListening
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
  }

  function finishSession() {
    if (happy) return;
    recogRef.current?.stop();
    setListening(false);
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

  const urgent = (painLevel !== null && painLevel >= 8) || result?.urgency === "emergency";
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
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3 pb-28 text-slate-800">
        <section className="order-1 overflow-hidden rounded-[2rem] border border-cyan-100 bg-gradient-to-b from-sky-50 via-white to-white px-4 pb-4 pt-4 text-center shadow-[0_18px_55px_-35px_rgba(14,116,144,0.5)]">
          <div className="relative mx-auto mb-5 w-fit">
            <span
              className={`absolute -inset-5 rounded-full bg-cyan-200/40 blur-2xl ${speaking ? "opacity-100" : "opacity-30"} transition-opacity duration-700`}
            />
            <NemoFace speaking={speaking || listening} emergency={urgent} happy={happy} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl" aria-hidden="true">
              🫧
            </span>
            <h2 className="text-xl font-extrabold text-slate-800">نيمو، رفيقك الصحي</h2>
            <Sparkles className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          </div>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-slate-600">
            {listening
              ? "نيمو بيسمعك… اتكلم براحتك"
              : speaking
                ? "نيمو بيتكلم معاك بهدوء"
                : "أنا هنا أسمعك وأساعدك"}
          </p>
        </section>

        <section
          aria-label="محادثتك مع نيمو"
          aria-live="polite"
          ref={chatContainerRef}
          className="order-2 max-h-64 space-y-3 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`nemo-chat-message flex items-end gap-2 ${message.role === "patient" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  message.role === "patient"
                    ? "rounded-tr-md bg-slate-100 text-slate-800"
                    : "rounded-tl-md border border-cyan-100 bg-cyan-50 text-cyan-950"
                }`}
              >
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
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> نيمو بيدوّر على التخصص المناسب
              </p>
            </div>
          )}
        </section>

        {(mentionsPain || painLevel !== null) && (
          <section className="order-4 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800">مقياس شدة الألم</h3>
                <p className="mt-1 text-xs text-slate-500">من 1 (خفيف) إلى 10 (شديد)</p>
              </div>
              <HeartPulse className={`h-6 w-6 ${urgent ? "text-rose-600" : "text-cyan-700"}`} />
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

        <form
          aria-label="أرسل رسالة إلى نيمو"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(need);
          }}
          className="order-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <input
              value={need}
              onChange={(event) => setNeed(event.target.value)}
              maxLength={800}
              aria-label="اكتب رسالتك لنيمو"
              placeholder={listening ? "نيمو بيسمعك… اتكلم براحتك" : "اكتب رسالتك لنيمو…"}
              className={`min-w-0 flex-1 rounded-xl border bg-white px-3 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${
                listening ? "border-rose-400" : "border-transparent"
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
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 ${
                listening
                  ? "animate-pulse bg-rose-600 text-white"
                  : "bg-cyan-100 text-cyan-800 hover:bg-cyan-200"
              }`}
            >
              {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="submit"
              disabled={loading || need.trim().length < 3}
              aria-label="إرسال الرسالة"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-700 text-white transition hover:bg-cyan-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              جاري الاستماع… اضغط الميكروفون لإيقاف التسجيل
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
      </div>
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
