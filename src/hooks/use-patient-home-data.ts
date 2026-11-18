import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clinicsQuery } from "@/lib/directory-queries";
import { getClinicProfileExtras, type ClinicProfileExtras } from "@/lib/clinic-profile";
import { getClinicStories, type StoryItem } from "@/lib/stories";
import {
  getPatientSession,
  getSavedBookings,
  updateSavedBookingStatuses,
  type SavedBooking,
} from "@/lib/patient-session";
import { svrGetPatientBookingStatuses } from "@/lib/data.functions";
import { getCachedProfile } from "@/lib/user-profile-cache";
import { parseReadings, READINGS_KEY } from "@/lib/organ-insights";
import { defaultLocation, getPatientLocation, type PatientLocation } from "@/lib/patient-location";
import { getTodayHydration, saveTodayHydration } from "@/lib/hydration";
import { type Clinic } from "@/lib/mock-data";

/** كل بيانات صفحة المريض الرئيسية: العيادات، الجلسة، الموقع، الحجز القادم، الترطيب. */
export function usePatientHomeData() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicsLoaded, setClinicsLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, ClinicProfileExtras>>({});
  const [stories, setStories] = useState<Record<string, StoryItem[]>>({});
  const [location, setLocation] = useState<PatientLocation>(defaultLocation);
  const [patientName, setPatientName] = useState<string>("");
  const [patientAvatar, setPatientAvatar] = useState<string | undefined>();
  const [healthSnapshot, setHealthSnapshot] = useState(() =>
    typeof window === "undefined" ? {} : parseReadings(window.localStorage.getItem(READINGS_KEY)),
  );
  const [hydration, setHydration] = useState(0);
  const [hydrationReady, setHydrationReady] = useState(false);
  const [upcomingBooking, setUpcomingBooking] = useState<SavedBooking | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLocation(getPatientLocation());
    setPatientName(getPatientSession()?.name?.trim() || "");
    setPatientAvatar(getCachedProfile()?.avatar);
    const refreshReadings = () =>
      setHealthSnapshot(parseReadings(window.localStorage.getItem(READINGS_KEY)));
    window.addEventListener("focus", refreshReadings);
    window.addEventListener("storage", refreshReadings);
    return () => {
      window.removeEventListener("focus", refreshReadings);
      window.removeEventListener("storage", refreshReadings);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshUpcomingBooking = async () => {
      const saved = getSavedBookings().filter((booking) => (booking.queueNumber ?? 0) > 0);
      if (!saved.length) {
        if (active) setUpcomingBooking(null);
        return;
      }
      try {
        const { rows } = await svrGetPatientBookingStatuses({
          data: { codes: saved.map((booking) => booking.code) },
        });
        if (!active) return;
        const statuses = rows.flatMap((row) =>
          ["waiting", "in", "done", "cancelled"].includes(row.status)
            ? [{ code: row.code, status: row.status as SavedBooking["status"] }]
            : [],
        );
        updateSavedBookingStatuses(statuses);
        const current = new Map(statuses.map((row) => [row.code, row.status]));
        setUpcomingBooking(
          saved.find((booking) => {
            const status = current.get(booking.code);
            return status === "waiting" || status === "in";
          }) ?? null,
        );
      } catch (error) {
        console.error("[PatientHome] Could not refresh booking status", error);
        toast.error("تعذّر تحديث حالة حجزك. تحقق من اتصالك بالإنترنت.");
        if (active) {
          setUpcomingBooking(
            saved.find((booking) => booking.status === "waiting" || booking.status === "in") ??
              null,
          );
        }
      }
    };
    void refreshUpcomingBooking();
    window.addEventListener("focus", refreshUpcomingBooking);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshUpcomingBooking);
    };
  }, []);

  useEffect(() => {
    setHydration(getTodayHydration());
    setHydrationReady(true);
  }, []);

  useEffect(() => {
    if (!hydrationReady) return;
    saveTodayHydration(hydration);
  }, [hydration, hydrationReady]);

  useEffect(() => {
    let cancelled = false;
    queryClient.fetchQuery(clinicsQuery).then(async (list) => {
      if (cancelled) return;
      setClinics(list);
      setClinicsLoaded(true);
      const visible = list.slice(0, 10);
      const results = await Promise.all(
        visible.map(async (clinic) => {
          const [profile, storySet] = await Promise.all([
            getClinicProfileExtras(clinic.id),
            getClinicStories(clinic.id),
          ]);
          return { id: clinic.id, profile, items: storySet.stories };
        }),
      );
      if (cancelled) return;
      setProfiles(Object.fromEntries(results.map((result) => [result.id, result.profile])));
      setStories(Object.fromEntries(results.map((result) => [result.id, result.items])));
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return {
    clinics,
    clinicsLoaded,
    profiles,
    stories,
    location,
    setLocation,
    patientName,
    patientAvatar,
    healthSnapshot,
    upcomingBooking,
    hydration,
    setHydration,
  };
}
