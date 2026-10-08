import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { LoaderCircle, Mic, Volume2, X, MicOff } from "lucide-react";
import { useFloatingVoiceAssistant } from "@/hooks/use-floating-voice-assistant";
import { isVoiceModeOn, setVoiceMode } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";

const PUBLIC_ROUTES = ["/login", "/register", "/auth", "/forgot-password", "/reset-password", "/landing", "/admin-access"];

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(!!data.user); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
      if (!session?.user) setVoiceMode(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  return signedIn;
}

const islandStyle = {
  position: "fixed",
  top: "calc(env(safe-area-inset-top) + 12px)",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 99999,
  maxWidth: "calc(100vw - 32px)",
} as const;

const pillClass =
  "rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-500 ease-out";

function WaveBars({ colorClass }: { colorClass: string }) {
  return (
    <span aria-hidden="true" className="flex items-end gap-[2px] h-4">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full motion-safe:animate-pulse ${colorClass}`}
          style={{ height: `${6 + ((i * 5) % 10)}px`, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

export function FloatingVoiceAssistant() {
  const signedIn = useSignedIn();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const allowed = signedIn && !isPublicRoute;
  const { enabled, state, message, resume, stop } = useFloatingVoiceAssistant(allowed);
  const [mounted, setMounted] = useState(false);
  const [askLogin, setAskLogin] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || isPublicRoute) return null;

  if (!signedIn) {
    const onTap = () => {
      setAskLogin(true);
      try {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance("أهلاً بك في سَنَد، سجّل دخولك الأول عشان نبدأ المحادثة");
          u.lang = "ar-EG";
          u.rate = 0.88;
          window.speechSynthesis.speak(u);
        }
      } catch { /* ignore */ }
    };
    return createPortal(
      <aside aria-label="مساعد سَنَد الصوتي" style={islandStyle} dir="rtl">
        {askLogin ? (
          <div className={`${pillClass} flex items-center gap-2 px-3 py-2 text-white`} role="status">
            <span className="text-xs font-semibold">سجّل دخولك لتفعيل المساعد الصوتي</span>
            <a href="/patient/login" className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              تسجيل الدخول
            </a>
            <button type="button" aria-label="إغلاق" onClick={() => setAskLogin(false)} className="rounded-full p-1 hover:bg-white/10">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={onTap} aria-label="تشغيل المساعد الصوتي" className={`${pillClass} flex items-center gap-2 px-4 py-2 text-white`}>
            <Mic className="h-4 w-4 text-cyan-300" />
            <span className="text-sm font-bold">سَنَد</span>
          </button>
        )}
      </aside>,
      document.body
    );
  }
  if (!allowed) return null;

  // Idle: compact pill — glowing mic + "سَنَد"
  if (!enabled) {
    return createPortal(
      <aside aria-label="مساعد سَنَد الصوتي" style={islandStyle} dir="rtl">
        <button
          type="button"
          onClick={() => setVoiceMode(true)}
          aria-label="تشغيل المساعد الصوتي"
          title="تشغيل المساعد الصوتي"
          className={`${pillClass} flex items-center gap-2 px-4 py-2 text-white`}
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-cyan-400/40 blur-[6px] motion-safe:animate-pulse" />
            <Mic className="relative h-4 w-4 text-cyan-300" />
          </span>
          <span className="text-sm font-bold">سَنَد</span>
        </button>
      </aside>,
      document.body
    );
  }

  const label = { listening: "بستمع...", speaking: "برد عليك", thinking: "بلحظة...", paused: "متوقف مؤقتاً", error: "استئناف" }[state];
  const Icon = state === "thinking" ? LoaderCircle : state === "speaking" ? Volume2 : state === "error" ? MicOff : Mic;
  const expanded = state === "speaking" || state === "thinking";

  return createPortal(
    <aside aria-label="مساعد سَنَد الصوتي" style={islandStyle} dir="rtl" role="status" aria-live="polite">
      <div className={`${pillClass} ${expanded ? "max-w-sm rounded-3xl px-4 py-3" : "px-4 py-2"} flex flex-col gap-2 text-white`}>
        <div className="flex items-center gap-2">
          {state === "listening" ? (
            <WaveBars colorClass="bg-emerald-400" />
          ) : state === "speaking" ? (
            <WaveBars colorClass="bg-cyan-400" />
          ) : (
            <Icon className={`h-4 w-4 ${state === "thinking" ? "motion-safe:animate-spin text-cyan-300" : state === "error" ? "text-red-400" : "text-cyan-300"}`} />
          )}
          <span className="text-xs font-bold">{label}</span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={state === "error" || state === "paused" ? resume : stop}
            aria-label={state === "error" || state === "paused" ? "استئناف المساعد الصوتي" : "إيقاف المساعد الصوتي"}
            title={state === "error" || state === "paused" ? message : "إيقاف مؤقت"}
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {state === "error" || state === "paused" ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setVoiceMode(false)}
            aria-label="إغلاق المساعد الصوتي"
            title="إغلاق المساعد الصوتي"
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {expanded && message && (
          <p className="max-h-24 overflow-y-auto text-xs leading-relaxed text-white/90">{message}</p>
        )}
      </div>
    </aside>,
    document.body
  );
}
