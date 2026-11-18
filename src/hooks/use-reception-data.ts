import { useCallback, useEffect, useState } from "react";
import { readPrefs } from "@/lib/app-prefs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playNotification } from "@/lib/sounds";
import { readBookingsCache, writeBookingsCache } from "@/lib/bookings-cache";
import { slotFor, type VisitKind } from "@/lib/clinic-queue";
import type { HealthPass } from "@/lib/health-pass";
import {
  getMyClinicMembership,
  signOutStaff,
  listBookingsForClinic,
  updateBookingStatus,
  addWalkIn,
  type Booking,
  type Clinic,
} from "@/lib/mock-data";
import type { VisitType } from "@/components/reception/AddPatientForm";

function timeNow(): string {
  return new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

export function useReceptionData() {
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [rows, setRows] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [recentlyCalledIds, setRecentlyCalledIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async (clinicId: string) => {
    setRefreshing(true);
    const fresh = await listBookingsForClinic(clinicId);
    if (fresh.length > 0) {
      setRows(fresh);
      setFromCache(false);
      writeBookingsCache(clinicId, fresh);
    } else {
      const cached = readBookingsCache(clinicId);
      if (cached.length > 0) {
        // Network hiccup: keep the last known sheet instead of an empty screen.
        setRows(cached);
        setFromCache(true);
      } else {
        setRows([]);
        setFromCache(false);
      }
    }
    setRefreshing(false);
  }, []);

  const load = useCallback(async () => {
    const { clinic: c, role } = await getMyClinicMembership();
    setSignedIn(role !== null || Boolean(c));
    setClinic(c);
    if (c) {
      setRows(readBookingsCache(c.id));
      await refresh(c.id);
    }
    setLoaded(true);
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!clinic) return;
    const ch = supabase
      .channel(`reception-bookings-${clinic.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `clinic_id=eq.${clinic.id}` },
        () => void refresh(clinic.id),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [clinic, refresh]);

  const callPatient = useCallback(
    async (r: Booking) => {
      if (!clinic) return;
      const updated = await updateBookingStatus(r.id, "in");
      if (!updated) {
        toast.error("تعذر إرسال النداء. حاول مرة أخرى.");
        return;
      }
      await refresh(clinic.id);
      playNotification();
      if (readPrefs().receptionVoiceCall && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(`الدور رقم ${r.queueNumber}، اتفضل للكشف`);
        u.lang = "ar-EG";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
      toast.success("تم توجيه النداء للمريض 🔔");
      setRecentlyCalledIds((prev) => {
        const next = new Set(prev);
        next.add(r.id);
        return next;
      });
      window.setTimeout(() => {
        setRecentlyCalledIds((prev) => {
          const next = new Set(prev);
          next.delete(r.id);
          return next;
        });
      }, 4000);
    },
    [clinic, refresh],
  );

  const setStatus = useCallback(
    async (b: Booking, status: Booking["status"]) => {
      if (!clinic) return;
      if (status === "cancelled" && !confirm(`إلغاء حجز ${b.patientName}؟`)) return;
      if (!(await updateBookingStatus(b.id, status))) {
        toast.error("تعذر تحديث حالة الحجز. حاول مرة أخرى.");
        return;
      }
      await refresh(clinic.id);
    },
    [clinic, refresh],
  );

  const addWalkInPatient = useCallback(
    async (name: string, phone: string, visitType: VisitType): Promise<boolean> => {
      if (!clinic || !name.trim()) return false;
      await addWalkIn({
        clinicId: clinic.id,
        patientName: name.trim(),
        patientPhone: phone.trim(),
        visitType,
        slot: timeNow(),
      });
      await refresh(clinic.id);
      return true;
    },
    [clinic, refresh],
  );

  const bookFromPass = useCallback(
    async (p: HealthPass, kind: VisitKind): Promise<boolean> => {
      if (!clinic) return false;
      const time = timeNow();
      const ok = await addWalkIn({
        clinicId: clinic.id,
        patientName: p.name,
        patientPhone: p.phone ?? "",
        visitType: kind === "followup" ? "followup" : "new",
        slot: slotFor(kind, time),
      });
      if (!ok) {
        toast.error("تعذر تسجيل الحجز. حاول مرة أخرى.");
        return false;
      }
      playNotification();
      toast.success(kind === "urgent" ? "تم تسجيل حالة مستعجلة 🚨" : "تم تسجيل الحجز ✅");
      await refresh(clinic.id);
      return true;
    },
    [clinic, refresh],
  );

  const signOut = useCallback(async () => {
    await signOutStaff();
    setSignedIn(false);
    setClinic(undefined);
  }, []);

  return {
    clinic,
    rows,
    loaded,
    signedIn,
    refreshing,
    fromCache,
    recentlyCalledIds,
    load,
    refresh,
    callPatient,
    setStatus,
    addWalkInPatient,
    bookFromPass,
    signOut,
  };
}
