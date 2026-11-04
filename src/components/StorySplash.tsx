import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope, Compass, HeartPulse, MapPin, Siren, Zap } from "lucide-react";
import scene1 from "@/assets/story/scene-1-night.jpg";
import scene2 from "@/assets/story/scene-2-grandpa.jpg";
import scene3 from "@/assets/story/scene-3-queue.jpg";
import scene4 from "@/assets/story/scene-4-family.jpg";
import scene5 from "@/assets/story/scene-5-map.jpg";
import doc1 from "@/assets/story/doc-1-chaos.jpg";
import doc2 from "@/assets/story/doc-2-queue.jpg";
import doc3 from "@/assets/story/doc-3-rx.jpg";
import doc4 from "@/assets/story/doc-4-hero.jpg";
import { ENTRY_KEY } from "@/components/WelcomeGate";
import useEmblaCarousel from "embla-carousel-react";
import { celebrate } from "@/lib/confetti";

export const STORY_SEEN_KEY = "sanad_story_seen_v1";
export const DOCTOR_STORY_SEEN_KEY = "sanad_doctor_story_seen_v1";

type Scene = { img: string; kicker: string; title: string; body: string; overlay?: "radar" | "verified"; hook?: string };

const patientScenes: Scene[] = [
  {
    img: scene1,
    kicker: "الساعة ٢ بالليل…",
    title: "سخونية مفاجئة، وقلب أم مش مطمّن",
    body: "نيمو بيسمعك بصوتك، يهدّيكي، ويقولك أول خطوة صح والتخصص المناسب.",
  },
  {
    img: scene2,
    kicker: "جدو مبيستناش حد يفكّره",
    title: "دوا الضغط في ميعاده، كل يوم",
    body: "منبّه الأدوية وكارت الطوارئ شغالين حتى من غير إنترنت، و١٣٦ مستشفى حكومي قريبين منك.",
  },
  {
    img: scene3,
    kicker: "مفيش زحمة انتظار تاني",
    title: "احجز، واشرب شايك، وسند يناديك",
    body: "تابع رقمك في الطابور مباشرة، وهيوصلك تنبيه لما دورك يقرّب.",
  },
  {
    img: scene5,
    kicker: "دكتورك على بُعد خطوات…",
    title: "رادار الأطباء والطوارئ… ولا دقيقة حيرة",
    body: "اعرف العيادات المفتوحة جنبك و١٣٦ مستشفى حكومي، بالمسافة وحالة الطابور.",
    overlay: "radar",
  },
  {
    img: scene4,
    kicker: "عيلتك كلها في أمان",
    title: "سند… في ضهرك في كل خطوة",
    body: "من الصغير للكبير، ملف طبي واحد ودكتور قريب ورفيق بيسمعك.",
  },
];

const doctorScenes: Scene[] = [
  {
    img: doc1,
    hook: "POV: يوم زحمة في العيادة ⏱️",
    kicker: "قبل سند…",
    title: "ورق ضايع، زحمة، و«لسه دوري ماجاش؟»",
    body: "عيادة مليانة ودوشة، والسكرتيرة تايهة بين التليفون والدفتر.",
  },
  {
    img: doc2,
    hook: "استنى الـ Glow up ✨",
    kicker: "شاشة الانتظار الذكية",
    title: "الشاشة بتنادي… والكل مرتاح",
    body: "طابور مباشر وتنبيه للمريض على موبايله، من غير زعيق على الدور.",
  },
  {
    img: doc3,
    hook: "روشتة في ٣٠ ثانية ⚡",
    kicker: "Rx بصوتك",
    title: "تملي الروشتة… وتوصل بكود QR",
    body: "روشتة إلكترونية واضحة بتتبعت للمريض فورًا وتتطبع بضغطة.",
  },
  {
    img: doc4,
    hook: "الـ Final form 🏆",
    kicker: "عيادتك موثّقة ✓",
    title: "وليك بروفايل عيادة متكامل",
    body: "شارة توثيق تطمّن المريض، ستوريات لعيادتك، وفريق سكرتارية تديره من موبايلك.",
    overlay: "verified",
  },
];

const SCENE_MS = 6500;

function RadarOverlay() {
  const pins = [
    { cls: "story-pin-a", icon: <MapPin className="h-4 w-4 text-story-glow" />, label: "د. سارة • أطفال", sub: "٤٠٠ م • مفتوحة الآن" },
    { cls: "story-pin-b", icon: <Siren className="h-4 w-4 text-story-glow" />, label: "مستشفى حكومي", sub: "طوارئ ٢٤ ساعة" },
    { cls: "story-pin-c", icon: <Zap className="h-4 w-4 text-story-glow" />, label: "د. أحمد • باطنة", sub: "حجز فوري" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
        <span className="story-radar-ring" />
        <span className="story-radar-ring" style={{ animationDelay: "0.9s" }} />
        <span className="story-radar-ring" style={{ animationDelay: "1.8s" }} />
        <span className="story-radar-sweep" />
        <span className="relative block h-4 w-4 rounded-full bg-story-glow shadow-gold" />
      </div>
      {pins.map((p, k) => (
        <div
          key={k}
          className={`story-pin ${p.cls} absolute flex items-center gap-2 rounded-2xl border border-story-ink/25 bg-story-night/55 px-3 py-2 backdrop-blur-sm`}
          style={{ animationDelay: `${400 + k * 350}ms` }}
        >
          {p.icon}
          <span className="leading-tight">
            <span className="block text-xs font-extrabold text-story-ink">{p.label}</span>
            <span className="block text-xs text-story-ink/80">{p.sub}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function StorySplash({ onDone, variant = "patient" }: { onDone: () => void; variant?: "patient" | "doctor" }) {
  const scenes = variant === "doctor" ? doctorScenes : patientScenes;
  const seenKey = variant === "doctor" ? DOCTOR_STORY_SEEN_KEY : STORY_SEEN_KEY;
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = i === scenes.length - 1;
  const [emblaRef, embla] = useEmblaCarousel({ direction: "rtl", duration: 28, dragFree: false });
  const celebrated = useRef(false);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(seenKey, "1");
    } catch {
      /* ignore */
    }
    onDone();
  }, [onDone, seenKey]);

  const go = useCallback(
    (n: number) => {
      const t = Math.max(0, Math.min(scenes.length - 1, n));
      if (embla) embla.scrollTo(t);
      else setI(t);
    },
    [embla, scenes.length],
  );

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => {
      setI(embla.selectedScrollSnap());
      try {
        navigator.vibrate?.(8);
      } catch {
        /* ignore */
      }
    };
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  useEffect(() => {
    if (last && !celebrated.current) {
      celebrated.current = true;
      const t = window.setTimeout(() => void celebrate(), 700);
      return () => window.clearTimeout(t);
    }
  }, [last]);

  useEffect(() => {
    if (paused || last) return;
    const t = window.setTimeout(() => go(i + 1), SCENE_MS);
    return () => window.clearTimeout(t);
  }, [i, paused, last, go]);

  const choose = (v: string, to: "/patient/login" | "/doctor/login" | null) => {
    try {
      localStorage.setItem(ENTRY_KEY, v);
    } catch {
      /* ignore */
    }
    finish();
    if (to) void navigate({ to });
  };

  return (
    <div
      className="story-root fixed inset-0 z-[100] overflow-hidden bg-story-night"
      dir="rtl"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
        <div className="flex h-full">
          {scenes.map((s, idx) => (
            <div key={idx} aria-hidden={idx !== i} className="relative h-full min-w-0 flex-[0_0_100%] overflow-hidden">
              <img
                src={s.img}
                alt=""
                width={768}
                height={960}
                loading={idx === 0 ? "eager" : "lazy"}
                draggable={false}
                className={`h-full w-full select-none object-cover ${idx === i ? "story-kenburns" : ""}`}
                style={{ animationPlayState: paused ? "paused" : "running" }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="story-shade pointer-events-none absolute inset-0" />
      <div className="story-grain pointer-events-none absolute inset-0" />
      {scenes[i].overlay === "radar" && <RadarOverlay key={`radar-${i}`} />}
      {scenes[i].overlay === "verified" && (
        <div key={`ver-${i}`} className="pointer-events-none absolute inset-x-0 top-[34%] z-[6] flex flex-col items-center gap-2.5 px-6" aria-hidden>
          {["✓ عيادة موثّقة", "⭐ بروفايل متكامل", "📅 حجز وطابور مباشر"].map((t, k) => (
            <span
              key={t}
              className="story-pin rounded-2xl border border-story-glow/50 bg-story-night/60 px-4 py-2 text-sm font-extrabold text-story-ink shadow-gold backdrop-blur-sm"
              style={{ animationDelay: `${500 + k * 450}ms` }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {scenes[i].hook && (
        <div key={`hook-${i}`} className="story-punch pointer-events-none absolute inset-x-0 top-[22%] z-[6] flex justify-center px-6">
          <span className="rounded-xl bg-story-ink px-4 py-2 text-lg font-extrabold text-story-night shadow-gold">{scenes[i].hook}</span>
        </div>
      )}

      {/* progress */}
      <div className="absolute inset-x-0 top-0 z-10 flex gap-1.5 px-4 pt-[max(env(safe-area-inset-top),14px)]">
        {scenes.map((_, idx) => (
          <span key={idx} className="h-1 flex-1 overflow-hidden rounded-full bg-story-ink/30">
            <span
              key={`${idx}-${i}`}
              className={`block h-full rounded-full bg-story-glow ${idx < i ? "w-full" : idx === i ? "story-progress" : "w-0"}`}
              style={{
                animationDuration: `${SCENE_MS}ms`,
                animationPlayState: paused ? "paused" : "running",
                ...(idx === i && last ? { width: "100%", animation: "none" } : {}),
              }}
            />
          </span>
        ))}
      </div>
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[calc(max(env(safe-area-inset-top),14px)+14px)]">
        <span className="flex items-center gap-1.5 text-sm font-extrabold text-story-ink">
          <HeartPulse className="h-4 w-4 text-story-glow" /> سند
        </span>
        {!last && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(scenes.length - 1);
            }}
            className="min-h-11 rounded-full bg-story-night/40 px-4 text-sm font-bold text-story-ink backdrop-blur-sm"
          >
            تخطي
          </button>
        )}
      </div>

      {/* caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 mx-auto max-w-md px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
        <div key={i} className="story-caption">
          <p className="story-line text-sm font-bold text-story-glow" style={{ animationDelay: "150ms" }}>
            {scenes[i].kicker}
          </p>
          <h1
            className="story-line mt-2 text-[28px] font-extrabold leading-[1.35] text-story-ink"
            style={{ animationDelay: "350ms" }}
          >
            {scenes[i].title}
          </h1>
          <p
            className="story-line mt-3 text-base leading-7 text-story-ink/85"
            style={{ animationDelay: "600ms" }}
          >
            {scenes[i].body}
          </p>
        </div>

        {last && variant === "doctor" ? (
          <div className="story-line pointer-events-auto mt-6 space-y-2.5" style={{ animationDelay: "850ms" }}>
            <button
              onClick={finish}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-story-glow text-base font-extrabold text-story-night shadow-gold transition active:scale-[0.97]"
            >
              <Stethoscope className="h-5 w-5" /> ابدأ عيادتك مع سند <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        ) : last ? (
          <div className="story-line pointer-events-auto mt-6 space-y-2.5" style={{ animationDelay: "850ms" }}>
            <button
              onClick={() => choose("patient", "/patient/login")}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-story-glow text-base font-extrabold text-story-night shadow-gold transition active:scale-[0.97]"
            >
              ابدأ مع عيلتك <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => choose("guest", null)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-story-ink/40 bg-story-night/40 text-sm font-bold text-story-ink backdrop-blur-sm transition active:scale-[0.97]"
            >
              <Compass className="h-4 w-4" /> اتفرّج كزائر
            </button>
            <Link
              to="/doctor/login"
              onClick={() => choose("doctor", null)}
              className="flex min-h-11 items-center justify-center gap-1.5 text-sm font-bold text-story-ink/80 underline-offset-4 hover:underline"
            >
              <Stethoscope className="h-4 w-4" /> أنا طبيب أو عيادة
            </Link>
          </div>
        ) : (
          <button
            onClick={() => go(i + 1)}
            className="pointer-events-auto mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-story-ink/20 text-sm font-extrabold text-story-ink backdrop-blur-sm transition active:scale-[0.97]"
          >
            التالي <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
