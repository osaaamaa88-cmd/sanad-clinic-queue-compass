import { useEffect, useState } from "react";
import { getMyClinicMembership } from "@/lib/mock-data";

let cache: Promise<string | null> | null = null;

/** Returns the signed-in user's clinic id when they are a doctor/secretary, else null. */
export function useDoctorClinicId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    cache ??= getMyClinicMembership().then((m) => m.clinic?.id ?? null).catch(() => null);
    let alive = true;
    void cache.then((v) => alive && setId(v));
    return () => {
      alive = false;
    };
  }, []);
  return id;
}

export function resetDoctorModeCache() {
  cache = null;
}
