import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setVoiceMode } from "@/lib/voice";

const IDLE_MS = 15 * 60 * 1000;

/** Signs the user out after 15 minutes without any interaction. */
export function IdleLogout() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let last = Date.now();
    const logout = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try { window.speechSynthesis?.cancel(); setVoiceMode(false); } catch { /* ignore */ }
      await supabase.auth.signOut();
      window.location.assign("/?expired=1");
    };
    const reset = () => {
      last = Date.now();
      clearTimeout(timer);
      timer = setTimeout(logout, IDLE_MS);
    };
    // Covers phones that slept: check elapsed time when the tab returns.
    const onVisible = () => {
      if (!document.hidden && Date.now() - last > IDLE_MS) void logout();
    };
    const evts = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    reset();
    return () => {
      clearTimeout(timer);
      evts.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
