import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PatientCallModal } from "@/components/PatientCallModal";
import { getPatientSession, getSavedBookings } from "@/lib/patient-session";
import { getVerifiedClinic } from "@/lib/mock-data";
import { notifyPatientCall, vibrateForPatientCall } from "@/lib/native";

type PatientCall = {
  booking_code: string;
  clinic_id: string;
  room: string | null;
};

type ActiveCall = {
  patientName: string;
  doctorName: string;
  queueNumber: number;
  room?: string;
};

export function PatientCallListener() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[PatientCallListener] Failed to load auth session:", error.message);
        return;
      }
      if (active) setUserId(data.session?.user.id ?? null);
    };
    void loadSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`patient-calls-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patient_calls",
          filter: `patient_user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Partial<PatientCall>;
          if (
            typeof row.booking_code !== "string" ||
            typeof row.clinic_id !== "string" ||
            !getSavedBookings().some((booking) => booking.code === row.booking_code)
          ) {
            return;
          }

          const booking = getSavedBookings().find((item) => item.code === row.booking_code);
          if (!booking) return;

          void getVerifiedClinic(row.clinic_id)
            .then((clinic) => {
              const call: ActiveCall = {
                patientName: getPatientSession()?.name || "مريض",
                doctorName: clinic?.doctor || booking.clinicName,
                queueNumber: booking.queueNumber ?? 0,
                room: row.room ?? undefined,
              };
              setActiveCall(call);
              void notifyPatientCall(
                "دورك حان الآن",
                `عيادة ${call.doctorName} — رقم دورك ${call.queueNumber}`,
              ).catch((error: unknown) => {
                console.error("[PatientCallListener] Local notification failed:", error);
              });
              void vibrateForPatientCall().catch((error: unknown) => {
                console.error("[PatientCallListener] Haptic alert failed:", error);
              });
            })
            .catch((error: unknown) => {
              console.error("[PatientCallListener] Failed to load clinic for patient call:", error);
            });
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[PatientCallListener] Realtime subscription failed:", error);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!activeCall) return null;

  return <PatientCallModal {...activeCall} onAcknowledge={() => setActiveCall(null)} />;
}
