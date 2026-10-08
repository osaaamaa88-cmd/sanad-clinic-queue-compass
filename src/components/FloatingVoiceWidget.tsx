import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { isVoiceModeOn } from "@/lib/voice";

export function FloatingVoiceWidget() {
  const [on, setOn] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    const sync = () => setOn(isVoiceModeOn());
    sync();
    window.addEventListener("sanad:voice-mode", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sanad:voice-mode", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (!on || path.startsWith("/accessibility-assistant")) return null;
  return (
    <Link
      to="/accessibility-assistant"
      search={{ listen: "1" } as never}
      aria-label="افتح المساعد الصوتي"
      className="fixed right-4 z-[70] flex h-16 w-16 items-center justify-center rounded-full bg-yellow-300 text-black shadow-[0_0_24px_rgba(253,224,71,0.8)] ring-4 ring-black focus-visible:outline-none focus-visible:ring-white"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-yellow-300/50" />
      <Mic className="relative h-8 w-8" />
    </Link>
  );
}
