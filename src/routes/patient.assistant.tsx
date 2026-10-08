import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, MapPin, Loader2, Siren, Phone, Star, Stethoscope, ChevronLeft, Lightbulb, Hospital, Navigation, Mic, MicOff, Volume2, Square } from "lucide-react";
import { toast } from "sonner";
import { applyFemaleVoice } from "@/lib/voice";
import { AppShell } from "@/components/AppShell";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { getPatientLocation, savePatientLocation, distanceKm, defaultLocation, type PatientLocation } from "@/lib/patient-location";
import { getVerifiedClinics, getSpecialty, type Clinic } from "@/lib/mock-data";
import { specialtyIcons } from "@/lib/specialty-icons";
import { runLocalTriage, type TriageResult } from "@/lib/triage-local";
import { aiTriage } from "@/lib/triage.functions";
import { listHospitals, HOSPITAL_TYPES, hospitalMapsUrl, type Hospital as HospitalRow } from "@/lib/hospitals.functions";

/** Arabic keywords per specialty used to match hospital departments. */
const SPECIALTY_DEPT_KEYWORDS: Record<string, string[]> = {
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

function hospitalMatchesSpecialty(h: HospitalRow, specialtyIds: string[]): boolean {
  const depts = (h.departments ?? []).join(" ");
  if (!depts) return false;
  return specialtyIds.some((id) =>
    (SPECIALTY_DEPT_KEYWORDS[id] ?? [getSpecialty(id)?.name ?? ""]).some((kw) => kw && depts.includes(kw)),
  );
}

export const Route = createFileRoute("/patient/assistant")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — المساعد الذكي لاختيار الطبيب" },
      { name: "description", content: "اكتب اللي بتحس بيه وموقعك، وسَنَد يرشّح لك التخصص والعيادة الأقرب." },
      { property: "og:title", content: "سَنَد — المساعد الذكي" },
      { property: "og:description", content: "اكتب احتياجك وسَنَد يوصلك للتخصص والعيادة المناسبة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assistant,
});

const examples = ["سناني بتوجعني ولثتي وارمة", "ابني عنده سخونية وكحة من يومين", "ركبتي بتوجعني لما بطلع السلم"];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Read an Arabic text aloud; returns a stop function. */
function speakArabic(text: string, onEnd: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    toast.error("القراءة الصوتية مش مدعومة على الجهاز ده");
    onEnd();
    return () => {};
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  applyFemaleVoice(u);
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
  return () => window.speechSynthesis.cancel();
}

function Assistant() {
  const [need, setNeed] = useState("");
  const [loc, setLoc] = useState<PatientLocation>(defaultLocation);
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hospitals, setHospitals] = useState<HospitalRow[]>([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    recogRef.current?.stop();
    stopSpeechRef.current?.();
  }, []);

  function toggleListening() {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error("الإدخال الصوتي مش مدعوم في المتصفح ده — جرّب كروم أو سفاري");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "ar-EG";
      rec.interimResults = true;
      rec.continuous = false;
      let finalText = "";
      rec.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        finalText = text.trim();
        setNeed(finalText);
      };
      rec.onerror = (e) => {
        setListening(false);
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast.error("المايكروفون مرفوض — اسمح بالوصول للمايك من إعدادات المتصفح");
        } else if (e.error !== "aborted") {
          toast.error("مش قادر أسمعك دلوقتي — جرّب تاني");
        }
      };
      rec.onend = () => {
        setListening(false);
        if (finalText.length >= 3) void submit(finalText);
      };
      recogRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      toast.error("تعذّر تشغيل المايكروفون على الجهاز ده");
    }
  }

  function toggleSpeak() {
    if (speaking) {
      stopSpeechRef.current?.();
      setSpeaking(false);
      return;
    }
    if (!result) return;
    const names = result.specialtyIds.map((id) => getSpecialty(id)?.name ?? id).join("، ");
    const text = [result.summary, names && `التخصصات المناسبة: ${names}.`, result.advice].filter(Boolean).join(" ");
    stopSpeechRef.current = speakArabic(text, () => setSpeaking(false));
    setSpeaking(true);
  }

  useEffect(() => {
    setLoc(getPatientLocation());
    getVerifiedClinics().then(setClinics);
    listHospitals().then(setHospitals).catch(() => {});
  }, []);

  async function submit(text?: string) {
    const q = (text ?? need).trim();
    if (q.length < 3 || loading) return;
    if (text) setNeed(q);
    setError(null);
    setLoading(true);
    try {
      const ai = await aiTriage({ data: { need: q } });
      setResult(ai ?? runLocalTriage(q));
    } catch {
      setResult(runLocalTriage(q));
    } finally {
      setLoading(false);
    }
  }

  const matches = result
    ? clinics
        .filter((c) => result.specialtyIds.includes(c.specialtyId))
        .map((c) => ({ c, d: c.lat != null && c.lng != null ? distanceKm(loc, { lat: c.lat, lng: c.lng }) : c.distanceKm }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
    : [];

  // Governmental hospitals: prefer specialty-department matches, else same-governorate
  // emergency/general facilities, else nearest overall. Never an empty state.
  const hospitalMatches = result
    ? (() => {
        const withDist = hospitals.map((h) => ({
          h,
          d: distanceKm(loc, { lat: Number(h.lat), lng: Number(h.lng) }),
        }));
        const byDept = withDist.filter((x) => hospitalMatchesSpecialty(x.h, result.specialtyIds));
        const sameGov = withDist.filter((x) => loc.city && x.h.governorate.includes(loc.city));
        const pool = byDept.length > 0 ? byDept : sameGov.length > 0 ? sameGov : withDist;
        return pool.sort((a, b) => a.d - b.d).slice(0, 6);
      })()
    : [];

  return (
    <AppShell title="المساعد الذكي">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <Bot className="h-9 w-9 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed">اكتب اللي بتحس بيه أو محتاجه بكلامك العادي، وأنا أرشّح لك التخصص المناسب وأقرب عيادة ليك.</p>
        </div>

        <button onClick={() => setPicker(true)} className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="flex-1 text-start">{loc.name}، {loc.city}</span>
          <span className="text-xs text-primary">تغيير ▾</span>
        </button>

        <div className="relative">
          <textarea
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            maxLength={800}
            rows={4}
            placeholder={listening ? "بسمعك… اتكلم براحتك" : "مثلاً: عندي صداع مستمر ودوخة من أسبوع…"}
            className={`w-full resize-none rounded-2xl border bg-card p-4 pe-14 text-base outline-none focus:border-primary ${listening ? "border-destructive" : "border-border"}`}
          />
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "إيقاف التسجيل" : "تحدث بدلاً من الكتابة"}
            className={`absolute bottom-3 end-3 grid h-10 w-10 place-items-center rounded-full transition ${
              listening
                ? "animate-pulse bg-destructive text-destructive-foreground shadow-[0_0_0_6px_rgba(239,68,68,0.25)]"
                : "bg-primary/15 text-primary hover:bg-primary/25"
            }`}
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          {listening && (
            <span className="pointer-events-none absolute bottom-3 start-4 flex items-end gap-0.5" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-1 animate-pulse rounded-full bg-destructive"
                  style={{ height: `${10 + ((i * 7) % 14)}px`, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((e) => (
            <button key={e} onClick={() => setNeed(e)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">
              {e}
            </button>
          ))}
        </div>

        <button
          onClick={() => submit()}
          disabled={loading || need.trim().length < 3}
          className="gradient-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> بفهم طلبك…</> : "رشّح لي الطبيب المناسب"}
        </button>

        {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {result && (
          <div className="space-y-3">
            {result.urgency === "emergency" && (
              <a href="tel:123" className="flex items-center gap-3 rounded-2xl bg-destructive p-4 font-bold text-destructive-foreground">
                <Siren className="h-6 w-6" /> الأعراض دي ممكن تكون طارئة — اتصل بالإسعاف 123 فوراً
              </a>
            )}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{result.summary}</p>
                <button
                  type="button"
                  onClick={toggleSpeak}
                  aria-label={speaking ? "إيقاف الاستماع" : "استماع للنتيجة"}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                    speaking ? "animate-pulse bg-primary text-primary-foreground" : "bg-primary/15 text-primary hover:bg-primary/25"
                  }`}
                >
                  {speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.specialtyIds.map((id) => {
                  const Icon = specialtyIcons[id] ?? Stethoscope;
                  return (
                    <span key={id} className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-sm font-bold text-primary">
                      <Icon className="h-4 w-4" /> {getSpecialty(id)?.name ?? id}
                    </span>
                  );
                })}
                {result.urgency === "soon" && <span className="rounded-full bg-accent px-3 py-1.5 text-xs">يُفضّل الكشف خلال يوم أو يومين</span>}
              </div>
              {result.advice && <p className="mt-3 flex gap-1.5 text-xs text-muted-foreground"><Lightbulb className="h-4 w-4 shrink-0 text-primary" />{result.advice}</p>}
            </div>

            <h3 className="font-bold">عيادات مناسبة قريبة منك</h3>
            {matches.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                لسه مفيش عيادات خاصة مسجّلة في التخصص ده — بس دي أقرب مستشفيات حكومية تقدر تقصدها 👇
              </div>
            )}
            {matches.length > 0 && (
              matches.map(({ c, d }) => (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{c.doctor}</p>
                    <p className="text-xs text-muted-foreground">
                      {getSpecialty(c.specialtyId)?.name} • {d.toFixed(1)} كم • <Star className="inline h-3 w-3" /> {c.rating}
                    </p>
                  </div>
                  {c.phone && (
                    <a href={`tel:${c.phone}`} aria-label="اتصال" className="rounded-full bg-primary/15 p-2 text-primary"><Phone className="h-4 w-4" /></a>
                  )}
                  <Link to="/patient/clinic/$id" params={{ id: c.id }} className="flex items-center text-sm text-primary">
                    عرض <ChevronLeft className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}

            {hospitalMatches.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="flex items-center gap-2 font-bold">
                  <Hospital className="h-5 w-5 text-destructive" /> مستشفيات حكومية وطوارئ قريبة منك
                </h3>
                {hospitalMatches.map(({ h, d }) => (
                  <div key={h.id} className="rounded-2xl border border-border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Link to="/hospital/$id" params={{ id: h.id }} className="block truncate font-bold hover:text-primary">
                          {h.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {h.governorate}{h.district ? ` • ${h.district}` : ""} • {d.toFixed(1)} كم
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                            {HOSPITAL_TYPES[h.hospital_type] ?? "مستشفى حكومي"}
                          </span>
                          {h.emergency_24h && (
                            <span className="rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground">طوارئ 24 ساعة</span>
                          )}
                          {h.has_icu && (
                            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px]">رعاية مركزة</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {h.phone && (
                          <a href={`tel:${h.phone}`} aria-label="اتصال بالمستشفى" className="rounded-full bg-primary/15 p-2 text-primary">
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={hospitalMapsUrl(h)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="الاتجاهات على الخريطة"
                          className="rounded-full bg-primary/15 p-2 text-primary"
                        >
                          <Navigation className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-center text-[11px] text-muted-foreground">المساعد للإرشاد فقط ولا يغني عن استشارة الطبيب.</p>
          </div>
        )}
      </div>
      {picker && (
        <LocationPickerModal
          current={loc}
          onSelect={(l) => { savePatientLocation(l); setLoc(l); setPicker(false); }}
          onClose={() => setPicker(false)}
        />
      )}
    </AppShell>
  );
}
