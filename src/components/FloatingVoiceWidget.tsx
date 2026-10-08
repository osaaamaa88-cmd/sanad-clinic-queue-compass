import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { LoaderCircle, Mic, Volume2, X, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const wrapStyle = {
  position: "fixed",
  right: "20px",
  bottom: "calc(env(safe-area-inset-bottom) + 95px)",
  left: "auto",
  top: "auto",
  zIndex: 99999,
  maxWidth: "calc(100vw - 32px)",
} as const;

export function FloatingVoiceAssistant() {
  const signedIn = useSignedIn();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const allowed = signedIn && !isPublicRoute;
  const { enabled, state, message, resume, stop } = useFloatingVoiceAssistant(allowed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !allowed) return null;

  if (!enabled) {
    return createPortal(
      <aside aria-label="مساعد سَنَد الصوتي" style={wrapStyle} dir="rtl" className="pointer-events-none flex items-center gap-2">
        <Button size="icon" onClick={() => setVoiceMode(true)} aria-label="تشغيل المساعد الصوتي" title="تشغيل المساعد الصوتي"
          className="pointer-events-auto h-12 w-12 rounded-full shadow-soft ring-2 ring-background [&_svg]:size-5">
          <Mic />
        </Button>
      </aside>,
      document.body
    );
  }

  const label = { listening: "إصغاء", speaking: "تحدث", thinking: "تفكير", paused: "متوقف مؤقتاً", error: "استئناف" }[state];
  const Icon = state === "thinking" ? LoaderCircle : state === "speaking" ? Volume2 : state === "error" ? MicOff : Mic;
  return createPortal(
    <aside aria-label="مساعد سَنَد الصوتي" style={wrapStyle} dir="rtl" className="pointer-events-none flex items-center gap-2">
      <div className="pointer-events-auto relative">
        {state === "listening" && <span aria-hidden="true" className="absolute -inset-1 rounded-full border-2 border-primary/40 motion-safe:animate-ping" />}
        <Button size="icon" variant={state === "error" ? "destructive" : "default"} onClick={state === "error" || state === "paused" ? resume : stop}
          title={state === "error" || state === "paused" ? message : "إيقاف المساعد الصوتي"}
          aria-label={state === "error" || state === "paused" ? "استئناف المساعد الصوتي" : "إيقاف المساعد الصوتي"}
          className="relative h-12 w-12 rounded-full shadow-soft ring-2 ring-background [&_svg]:size-5">
          <Icon className={state === "thinking" ? "motion-safe:animate-spin" : ""} />
        </Button>
        <Button size="icon" variant="secondary" onClick={() => setVoiceMode(false)} aria-label="إغلاق المساعد الصوتي" title="إغلاق المساعد الصوتي"
          className="absolute -left-1 -top-2 h-5 w-5 rounded-full border border-border [&_svg]:size-3"><X /></Button>
      </div>
      <span role="status" aria-live="polite" className="rounded-md border border-border bg-background/95 px-3 py-2 text-xs font-bold text-foreground shadow-soft">
        {label}<span className="sr-only">: {message}</span>
      </span>
    </aside>,
    document.body
  );
}
