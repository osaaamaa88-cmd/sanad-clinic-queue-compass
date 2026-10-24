import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyClinicMembership } from "@/lib/mock-data";

let cache: Promise<string | null> | null = null;
const EVT = "sanad:doctor-mode-reset";
let listening = false;

function ensureAuthListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
      resetDoctorModeCache();
  });
}

/** Returns the signed-in user's clinic id when they are a doctor/secretary, else null. */
export function useDoctorClinicId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    ensureAuthListener();
    let alive = true;
    const load = () => {
      cache ??= getMyClinicMembership()
        .then((m) => m.clinic?.id ?? null)
        .catch(() => null);
      void cache.then((v) => alive && setId(v));
    };
    load();
    window.addEventListener(EVT, load);
    return () => {
      alive = false;
      window.removeEventListener(EVT, load);
    };
  }, []);
  return id;
}

export function resetDoctorModeCache() {
  cache = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}
