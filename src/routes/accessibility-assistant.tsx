import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Phone, MapPin, ArrowRight } from "lucide-react";
import { voiceAssist } from "@/lib/voice-assist.functions";
import { createRecognizer, speak } from "@/lib/voice";
import { getPatientLocation } from "@/lib/patient-location";

export const Route = createFileRoute("/accessibility-assistant")({
  head: () => ({
    meta: [
      { title: "المساعد الصوتي | سَنَد" },
      { name: "description", content: "مساعد صوتي بالعامية المصرية لفاقدي البصر وكبار السن يوصلك لأقرب مستشفى." },
      { property: "og:title", content: "المساعد الصوتي | سَنَد" },
      { property: "og:description", content: "اتكلم بالعامية وسَنَد يوجهك لأقرب مستشفى ويتصل بيها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoicePage,
});

type Hosp = { name: string; phone: string; address: string; km: number; approx: boolean; lat: number; lng: number } | null;
const WELCOME = "أهلاً بك في سَنَد، أنا معك. قل لي ماذا تشعر أو ما هي مشكلتك وسأساعدك فوراً.";
const CALL = ["اتصل", "رن", "كلمهم", "تليفون", "اطلب", "أه", "اه", "ايوه", "أيوه"];
const NAV = ["اوصف", "أوصف", "عنوان", "طريق", "ازاي اروح", "إزاي أروح"];

function VoicePage() {
  const [state, setState] = useState<"idle" | "speaking" | "listening" | "thinking">("idle");
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState(WELCOME);
  const [unsupported, setUnsupported] = useState(false);
  const hosp = useRef<Hosp>(null);
  const started = useRef(false);

  const listen = () => {
    const r = createRecognizer();
    if (!r) {
      setUnsupported(true);
      speak("للأسف المتصفح ده مش بيدعم الميكروفون. جرب من كروم.");
      return;
    }
    window.speechSynthesis?.cancel();
    setState("listening");
    let got = false;
    r.onresult = (e) => {
      got = true;
      const t = e.results[0]?.[0]?.transcript ?? "";
      setHeard(t);
      void handle(t);
    };
    r.onerror = (e) => {
      setState("idle");
      if (e.error === "not-allowed") speak("محتاج تسمح للميكروفون من إعدادات المتصفح.");
    };
    r.onend = () => { if (!got) setState("idle"); };
    try { r.start(); } catch { setState("idle"); }
  };

  const say = (text: string, thenListen = true) => {
    setReply(text);
    setState("speaking");
    speak(text, () => (thenListen ? listen() : setState("idle")));
  };

  const handle = async (text: string) => {
    const h = hosp.current;
    if (h && CALL.some((w) => text.includes(w))) {
      say(`حاضر، بتصل بـ ${h.name} دلوقتي.`, false);
      setTimeout(() => window.open("tel:" + h.phone), 1200);
      return;
    }
    if (h && NAV.some((w) => text.includes(w))) {
      say(`${h.name}، عنوانها: ${h.address}. على بعد حوالي ${h.km} كيلو منك${h.approx ? "، والموقع تقريبي" : ""}. اسأل أي حد قريب منك أو اطلب عربية لحد العنوان ده. تحب أتصل بيهم؟`);
      return;
    }
    setState("thinking");
    try {
      const loc = getPatientLocation();
      const res = await voiceAssist({ data: { text, lat: loc.lat, lng: loc.lng } });
      hosp.current = res.hospital;
      say(res.reply);
    } catch {
      say("حصلت مشكلة في الاتصال. لو الحالة طارئة اتصل بالإسعاف 123.", false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const auto = new URLSearchParams(location.search).get("listen") === "1";
    if (auto) listen();
    else say(WELCOME);
    return () => window.speechSynthesis?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const label = { idle: "دوس واتكلم", speaking: "سَنَد بيتكلم…", listening: "بسمعك…", thinking: "بفكر…" }[state];

  return (
    <main className="fixed inset-0 z-[60] flex flex-col bg-black text-white" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="flex items-center justify-between p-4">
        <Link to="/" aria-label="رجوع" className="rounded-full border-2 border-white p-3"><ArrowRight className="h-7 w-7" /></Link>
        <h1 className="text-2xl font-extrabold text-yellow-300">المساعد الصوتي</h1>
        <span className="w-14" />
      </header>

      <button
        onClick={listen}
        disabled={state === "thinking"}
        aria-label={label}
        className="relative mx-4 flex flex-1 flex-col items-center justify-center gap-6 rounded-[2.5rem] border-4 border-yellow-300 bg-zinc-900 focus:outline-none focus-visible:ring-8 focus-visible:ring-yellow-300/60"
      >
        <span className={`relative flex h-48 w-48 items-center justify-center rounded-full ${state === "listening" ? "bg-red-600" : "bg-yellow-300"}`}>
          {(state === "listening" || state === "speaking") && (
            <span className={`absolute inset-0 animate-ping rounded-full ${state === "listening" ? "bg-red-500/60" : "bg-yellow-300/50"}`} />
          )}
          <Mic className={`relative h-24 w-24 ${state === "listening" ? "text-white" : "text-black"}`} />
        </span>
        <span className="text-3xl font-extrabold">{label}</span>
      </button>

      <section aria-live="polite" className="space-y-2 p-4 text-center">
        {heard && <p className="text-lg text-zinc-300">قلت: «{heard}»</p>}
        <p className="text-xl font-bold leading-relaxed">{reply}</p>
        {unsupported && <p className="text-yellow-300">الميكروفون غير مدعوم هنا.</p>}
      </section>

      <div className="grid grid-cols-2 gap-3 p-4">
        <button onClick={() => void handle("اتصل")} className="flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-5 text-xl font-extrabold text-black">
          <Phone className="h-7 w-7" /> اتصل
        </button>
        <button onClick={() => void handle("اوصف العنوان")} className="flex items-center justify-center gap-2 rounded-2xl bg-white py-5 text-xl font-extrabold text-black">
          <MapPin className="h-7 w-7" /> العنوان
        </button>
      </div>
    </main>
  );
}
