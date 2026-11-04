import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope, Compass, HeartPulse } from "lucide-react";
import scene1 from "@/assets/story/scene-1-night.jpg";
import scene2 from "@/assets/story/scene-2-grandpa.jpg";
import scene3 from "@/assets/story/scene-3-queue.jpg";
import scene4 from "@/assets/story/scene-4-family.jpg";
import { ENTRY_KEY } from "@/components/WelcomeGate";

export const STORY_SEEN_KEY = "sanad_story_seen_v1";

const scenes = [
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
    img: scene4,
    kicker: "عيلتك كلها في أمان",
    title: "سند… في ضهرك في كل خطوة",
    body: "من الصغير للكبير، ملف طبي واحد ودكتور قريب ورفيق بيسمعك.",
  },
] as const;

const SCENE_MS = 6500;

export function StorySplash({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const last = i === scenes.length - 1;

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORY_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    onDone();
  }, [onDone]);

  const go = useCallback((n: number) => setI(Math.max(0, Math.min(scenes.length - 1, n))), []);

  useEffect(() => {
    if (paused || last) return;
    const t = window.setTimeout(() => setI((v) => v + 1), SCENE_MS);
    return () => window.clearTimeout(t);
  }, [i, paused, last]);

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
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        // RTL: swipe left = next
        if (dx < -50) go(i + 1);
        else if (dx > 50) go(i - 1);
      }}
    >
      {scenes.map((s, idx) => (
        <div
          key={idx}
          aria-hidden={idx !== i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${idx === i ? "opacity-100" : "opacity-0"}`}
        >
          <img
            src={s.img}
            alt=""
            width={768}
            height={960}
            loading={idx === 0 ? "eager" : "lazy"}
            className={`h-full w-full object-cover ${idx === i ? "story-kenburns" : ""}`}
            style={{ animationPlayState: paused ? "paused" : "running" }}
          />
        </div>
      ))}
      <div className="story-shade pointer-events-none absolute inset-0" />
      <div className="story-grain pointer-events-none absolute inset-0" />

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

      {/* tap zones */}
      <button aria-label="المشهد السابق" className="absolute inset-y-24 right-0 z-[5] w-1/3" onClick={() => go(i - 1)} />
      <button aria-label="المشهد التالي" className="absolute inset-y-24 left-0 z-[5] w-1/3" onClick={() => go(i + 1)} />

      {/* caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-md px-6 pb-[max(env(safe-area-inset-bottom),24px)]">
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

        {last ? (
          <div className="story-line mt-6 space-y-2.5" style={{ animationDelay: "850ms" }}>
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
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-story-ink/20 text-sm font-extrabold text-story-ink backdrop-blur-sm transition active:scale-[0.97]"
          >
            التالي <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
