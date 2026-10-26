import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Heart, Shield, FileText, Calendar, Stethoscope, Bot } from "lucide-react";
import { getPatientSession, type PatientSession } from "@/lib/patient-session";

type Reading =
  | { kind: "bp"; sys: number; dia: number; label: string; at: string }
  | {
      kind: "sugar";
      value: number;
      state: "fasting" | "postmeal" | "random";
      label: string;
      at: string;
    };

const STORAGE_KEY = "sanad_health_readings_v1";
const LEGACY_STORAGE_KEY = "sandi_health_readings_v1";

function loadReadings(): Reading[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, raw);
    return JSON.parse(raw || "[]") as Reading[];
  } catch {
    return [];
  }
}

type BPCategory = {
  label: string;
  tone: "success" | "warning" | "orange" | "destructive" | "crisis";
  advice: string;
};
type SugarCategory = { label: string; tone: "success" | "warning" | "destructive"; advice: string };

function evaluateBP(sys: number, dia: number): BPCategory {
  if (sys > 180 || dia > 120)
    return {
      label: "أزمة ضغط — طوارئ",
      tone: "crisis",
      advice: "توجّه فوراً لأقرب مستشفى أو عيادة طوارئ.",
    };
  if (sys >= 140 || dia >= 90)
    return {
      label: "ارتفاع — المرحلة الثانية",
      tone: "destructive",
      advice: "يفضّل مراجعة الطبيب في أقرب وقت.",
    };
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89))
    return {
      label: "ارتفاع — المرحلة الأولى",
      tone: "orange",
      advice: "غيّر نمط حياتك وتابع مع طبيبك.",
    };
  if (sys >= 120 && sys <= 129 && dia < 80)
    return { label: "مرتفع بسيط", tone: "warning", advice: "راقب القراءات بانتظام." };
  return { label: "طبيعي", tone: "success", advice: "قراءة ممتازة." };
}

function evaluateSugar(value: number, state: "fasting" | "postmeal" | "random"): SugarCategory {
  if (state === "fasting") {
    if (value < 100) return { label: "طبيعي", tone: "success", advice: "قراءة صيام طبيعية." };
    if (value <= 125) return { label: "ما قبل السكري", tone: "warning", advice: "راجع طبيبك." };
    return { label: "مرتفع — سكري محتمل", tone: "destructive", advice: "يلزم التوجه لطبيب." };
  }
  if (state === "postmeal") {
    if (value < 140) return { label: "طبيعي", tone: "success", advice: "قراءة بعد الأكل طبيعية." };
    if (value <= 199) return { label: "ما قبل السكري", tone: "warning", advice: "قلل السكريات." };
    return { label: "مرتفع — سكري محتمل", tone: "destructive", advice: "استشر الطبيب فوراً." };
  }
  if (value < 140) return { label: "طبيعي", tone: "success", advice: "ضمن المعدل الطبيعي." };
  if (value <= 199) return { label: "مرتفع نسبياً", tone: "warning", advice: "أعد القياس صائماً." };
  return { label: "مرتفع جداً", tone: "destructive", advice: "استشر الطبيب فوراً." };
}

function stabilityScore(r: Reading): number {
  if (r.kind === "bp") {
    const c = evaluateBP(r.sys, r.dia);
    switch (c.tone) {
      case "success":
        return 100;
      case "warning":
        return 78;
      case "orange":
        return 62;
      case "destructive":
        return 38;
      case "crisis":
        return 10;
      default:
        return 50;
    }
  }
  const c = evaluateSugar(r.value, r.state);
  switch (c.tone) {
    case "success":
      return 100;
    case "warning":
      return 68;
    case "destructive":
      return 34;
    default:
      return 50;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export interface PatientMedicalProfileProps {
  vitalsContent?: React.ReactNode;
  recordsContent?: React.ReactNode;
  appointmentsContent?: React.ReactNode;
}

type Organ = "head" | "heart" | "abdomen";

const ORGAN_LABELS: Record<Organ, string> = {
  head: "الرأس / الدماغ",
  heart: "الصدر / القلب",
  abdomen: "البطن / البنكرياس",
};

export function PatientMedicalProfile({
  vitalsContent,
  recordsContent,
  appointmentsContent,
}: PatientMedicalProfileProps = {}) {
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "appointments">("overview");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientCode, setPatientCode] = useState("SANAD-GUEST");
  const [selectedOrgan, setSelectedOrgan] = useState<Organ | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<Organ | null>(null);

  useEffect(() => {
    const refresh = () => {
      setReadings(loadReadings());
      const s: PatientSession | null = getPatientSession();
      const name = s?.name?.trim() || "";
      setPatientName(name);
      const digits = (s?.phone || "").replace(/\D/g, "");
      if (digits) setPatientCode("SANAD-" + digits.slice(-5));
      else if (s?.userId) setPatientCode("SANAD-" + s.userId.slice(0, 6).toUpperCase());
      else setPatientCode("SANAD-GUEST");
    };
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const lastBP = [...readings].reverse().find((r) => r.kind === "bp") as
    Extract<Reading, { kind: "bp" }> | undefined;
  const lastSugar = [...readings].reverse().find((r) => r.kind === "sugar") as
    Extract<Reading, { kind: "sugar" }> | undefined;

  const headCat = lastBP ? evaluateBP(lastBP.sys, lastBP.dia) : null;
  const headColor =
    !headCat || headCat.tone === "success"
      ? "#22c55e"
      : headCat.tone === "warning"
        ? "#f59e0b"
        : headCat.tone === "orange"
          ? "#f97316"
          : "#ef4444";

  const sugarCat = lastSugar ? evaluateSugar(lastSugar.value, lastSugar.state) : null;
  const sugarColor =
    !sugarCat || sugarCat.tone === "success"
      ? "#22c55e"
      : sugarCat.tone === "warning"
        ? "#f59e0b"
        : "#ef4444";

  const heartColor = "#fb7185";
  const bpm = 75;

  const overall = readings.length
    ? readings.slice(-8).reduce((acc, r) => acc + stabilityScore(r), 0) /
      Math.min(readings.length, 8)
    : 95;
  const overallLabel =
    overall >= 90 ? "نشط ومستقر" : overall >= 70 ? "يحتاج متابعة" : "يحتاج عناية";

  const headNeedsPulse = !!headCat && headCat.tone !== "success";

  const tooltipOrgan = hoveredOrgan ?? selectedOrgan;
  const tooltipData = (o: Organ) => {
    if (o === "head") {
      return {
        reading: lastBP ? lastBP.sys + "/" + lastBP.dia + " mmHg" : "لا توجد قراءة",
        date: lastBP ? formatDate(lastBP.at) : "—",
        status: headCat ? headCat.label : "مستقر",
      };
    }
    if (o === "heart") {
      return {
        reading: lastBP ? "الضغط الانقباضي " + lastBP.sys + " mmHg" : "لا توجد قراءة",
        date: lastBP ? formatDate(lastBP.at) : "—",
        status:
          "نبض " +
          bpm +
          " BPM — " +
          (headCat && headCat.tone !== "success" ? "يحتاج متابعة" : "مستقر"),
      };
    }
    return {
      reading: lastSugar ? lastSugar.value + " mg/dL" : "لا توجد قراءة",
      date: lastSugar ? formatDate(lastSugar.at) : "—",
      status: sugarCat ? sugarCat.label : "مستقر",
    };
  };

  const organPos: Record<Organ, { left: string; top: string }> = {
    head: { left: "50%", top: "9%" },
    heart: { left: "50%", top: "34%" },
    abdomen: { left: "50%", top: "50%" },
  };

  const nemoOrganLabel = selectedOrgan ? ORGAN_LABELS[selectedOrgan] : "اختر عضواً من المجسم";

  return (
    <div className="bg-slate-950 text-white min-h-screen p-6 font-sans" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-cyan-400 text-xs font-semibold tracking-wider">
            منصة سند الطبية
          </span>
          <h1 className="text-2xl font-bold mt-1">الملف الطبي الشامل للمريض</h1>
        </div>
        <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === "overview" ? "bg-cyan-500 text-white font-medium" : "text-slate-400 hover:text-white"}`}
          >
            المؤشرات الحيوية
          </button>
          <button
            onClick={() => setActiveTab("records")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === "records" ? "bg-cyan-500 text-white font-medium" : "text-slate-400 hover:text-white"}`}
          >
            السجلات والتقارير
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${activeTab === "appointments" ? "bg-cyan-500 text-white font-medium" : "text-slate-400 hover:text-white"}`}
          >
            المواعيد والحجوزات
          </button>
          <Link
            to="/patient/assistant"
            className="px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-1.5 text-cyan-400 hover:text-white hover:bg-cyan-500/20"
          >
            <Bot className="w-4 h-4" /> مساعد نيمو الذكي
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">معدل الصحة العامة</span>
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-extrabold text-green-400">{overall.toFixed(1)}%</div>
            <div className="text-xs text-slate-500 mt-1">ضغط الدم المثالي: 120 / 80 mmHg</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">نبضات القلب (Heart Rate)</span>
              <Heart className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-cyan-400">{bpm} BPM</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-cyan-400 h-full" style={{ width: "75%" }}></div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-6 flex flex-col items-center justify-between relative shadow-2xl min-h-[420px]">
          <div className="absolute inset-0 bg-cyan-500/5 rounded-2xl"></div>
          <div className="w-full flex justify-between items-center z-10">
            <span className="text-xs text-cyan-400 font-mono">ID: {patientCode}</span>
            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs text-cyan-300">
              {patientName ? patientName : overallLabel}
            </span>
          </div>

          <div className="relative flex flex-col items-center z-10 my-4">
            {tooltipOrgan && (
              <div
                className="absolute z-20 w-52 rounded-xl border border-cyan-500/40 bg-slate-900/95 p-3 text-xs shadow-xl"
                style={{
                  left: organPos[tooltipOrgan as Organ].left,
                  top: organPos[tooltipOrgan as Organ].top,
                  transform: "translate(-50%, -130%)",
                }}
              >
                <div className="font-bold text-cyan-300 mb-1">
                  {ORGAN_LABELS[tooltipOrgan as Organ]}
                </div>
                <div className="text-slate-300">
                  آخر قراءة: {tooltipData(tooltipOrgan as Organ).reading}
                </div>
                <div className="text-slate-500">
                  التاريخ: {tooltipData(tooltipOrgan as Organ).date}
                </div>
                <div className="text-slate-400">
                  الحالة: {tooltipData(tooltipOrgan as Organ).status}
                </div>
              </div>
            )}

            <svg viewBox="0 0 200 420" className="w-44 h-80" aria-label="المجسم التشريعي التفاعلي">
              <defs>
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g
                stroke="rgba(34,211,238,0.55)"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="100" cy="42" r="26" />
                <path d="M100 68 L100 82" />
                <path d="M62 95 Q100 84 138 95" />
                <path d="M62 95 L56 175" />
                <path d="M138 95 L144 175" />
                <path d="M60 105 L40 175" />
                <path d="M140 105 L160 175" />
                <path d="M74 82 L74 225 Q100 240 126 225 L126 82" />
                <path d="M88 225 L82 330" />
                <path d="M112 225 L118 330" />
                <path d="M70 330 L60 400" />
                <path d="M130 330 L140 400" />
              </g>

              <g>
                <circle
                  cx="100"
                  cy="42"
                  r="15"
                  fill={headColor}
                  opacity="0.18"
                  className={headNeedsPulse ? "animate-ping" : ""}
                  style={{ transformOrigin: "100px 42px", transformBox: "fill-box" }}
                  onMouseEnter={() => setHoveredOrgan("head")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => {
                    setSelectedOrgan("head");
                    setActiveTab("overview");
                  }}
                />
                <circle
                  cx="100"
                  cy="42"
                  r="7"
                  fill={headColor}
                  filter="url(#neonGlow)"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredOrgan("head")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => {
                    setSelectedOrgan("head");
                    setActiveTab("overview");
                  }}
                />
              </g>

              <g>
                <circle
                  cx="100"
                  cy="150"
                  r="15"
                  fill={heartColor}
                  opacity="0.18"
                  className="animate-ping"
                  style={{ transformOrigin: "100px 150px", transformBox: "fill-box" }}
                  onMouseEnter={() => setHoveredOrgan("heart")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => setSelectedOrgan("heart")}
                />
                <circle
                  cx="100"
                  cy="150"
                  r="7"
                  fill={heartColor}
                  filter="url(#neonGlow)"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredOrgan("heart")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => setSelectedOrgan("heart")}
                />
                <g
                  transform="translate(92,142) scale(0.6)"
                  style={{
                    transformOrigin: "100px 150px",
                    transformBox: "fill-box",
                    animation: "pulse " + (60 / bpm).toFixed(2) + "s ease-in-out infinite",
                  }}
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    fill="#ffffff"
                  />
                </g>
              </g>

              <g>
                <circle
                  cx="100"
                  cy="210"
                  r="15"
                  fill={sugarColor}
                  opacity="0.18"
                  className="animate-ping"
                  style={{ transformOrigin: "100px 210px", transformBox: "fill-box" }}
                  onMouseEnter={() => setHoveredOrgan("abdomen")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => {
                    setSelectedOrgan("abdomen");
                    setActiveTab("overview");
                  }}
                />
                <circle
                  cx="100"
                  cy="210"
                  r="7"
                  fill={sugarColor}
                  filter="url(#neonGlow)"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredOrgan("abdomen")}
                  onMouseLeave={() => setHoveredOrgan(null)}
                  onClick={() => {
                    setSelectedOrgan("abdomen");
                    setActiveTab("overview");
                  }}
                />
              </g>
            </svg>
            <span className="text-xs text-slate-400 mt-3">
              المجسم التشريعي التفاعلي لحالة المريض
            </span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2 z-10">
            <Link
              to="/patient/search"
              className="bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 py-2 rounded-xl text-xs text-cyan-300 transition-all flex items-center justify-center gap-1"
            >
              <Stethoscope className="w-3.5 h-3.5" /> فحص جديد
            </Link>
            <button
              onClick={() => setActiveTab("records")}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2 rounded-xl text-xs text-slate-300 transition-all flex items-center justify-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" /> التقرير الشامل
            </button>
          </div>
          <div className="w-full z-10 mt-2">
            <Link
              to="/patient/assistant"
              className="block bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 py-2 rounded-xl text-xs text-cyan-300 transition-all text-center"
            >
              توجيه نيمو لهذا العضو: {nemoOrganLabel}
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
              <Calendar className="w-5 h-5" /> الحجوزات والمواعيد القادمة
            </div>
            <div className="space-y-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">متابعة العيادة الدورية</div>
                  <div className="text-xs text-slate-500 mt-0.5">غداً، 04:30 مساءً</div>
                </div>
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                  مؤكد
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-2">
              <Shield className="w-5 h-5" /> ملاحظات التوصيات الطبية
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              المؤشرات الحيوية تدل على استقرار الحالة. يوصى بالاستمرار على جدول المواعيد والمتابعة
              المنتظمة عبر النظام.
            </p>
          </div>
          <Link
            to="/patient/assistant"
            className="block bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30 p-4 rounded-2xl text-xs text-cyan-300 transition-all text-center"
          >
            💡 هل تريد بدء محادثة جديدة مع نيمو؟
          </Link>
        </div>

        <div className="mt-6 lg:col-span-3">
          {activeTab === "overview" && vitalsContent ? vitalsContent : null}
          {activeTab === "records" && recordsContent ? recordsContent : null}
          {activeTab === "appointments" && appointmentsContent ? appointmentsContent : null}
        </div>
      </div>
    </div>
  );
}

export default PatientMedicalProfile;
