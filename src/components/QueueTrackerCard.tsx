import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Clock, Users } from "lucide-react";
import { getVerifiedClinic, type Clinic } from "@/lib/mock-data";
import { getSavedBookings } from "@/lib/patient-session";
import { computeQueueState } from "@/lib/queue-tracker";

const POLL_MS = 20000;

/** Live queue tracker shown on the patient home when a booking was made on this device. */
export function QueueTrackerCard() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const latest = getSavedBookings()[0];
    if (!latest) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      const c = await getVerifiedClinic(latest.clinicId);
      if (!cancelled) {
        setClinic(c ?? null);
        setChecked(true);
      }
    };
    void tick();
    const t = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (!checked) {
    return (
      <div className="mt-3 h-28 animate-pulse rounded-3xl border border-border/50 bg-card/60" />
    );
  }
  if (!clinic || !clinic.yourNumber) return null;

  const state = computeQueueState(clinic.nowServing, clinic.yourNumber);

  return (
    <Link
      to="/patient/queue/$id"
      params={{ id: clinic.id }}
      aria-label={`متابعة دورك في عيادة ${clinic.doctor}`}
      className="mt-3 block rounded-3xl border border-primary/30 bg-gradient-to-b from-card/90 to-card/60 p-4 text-right shadow-soft backdrop-blur-xl transition active:scale-[0.98] hover:border-primary/60"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Users className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{clinic.doctor}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-success">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            متابعة الدور مباشرة
          </span>
        </span>
        <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-primary-soft/50 px-2 py-2.5">
          <p className="text-[10px] font-bold text-muted-foreground">رقم دورك</p>
          <p className="mt-0.5 text-2xl font-black text-primary">{clinic.yourNumber}</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 px-2 py-2.5">
          <p className="text-[10px] font-bold text-muted-foreground">جوه دلوقتي</p>
          <p className="mt-0.5 text-2xl font-black">{clinic.nowServing}</p>
        </div>
        <div className="rounded-2xl bg-secondary/60 px-2 py-2.5">
          <p className="text-[10px] font-bold text-muted-foreground">الانتظار</p>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-sm font-extrabold">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {state.arrived ? "دورك!" : `~${state.etaMinutes} د`}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-700 ${state.arrived ? "bg-success" : "bg-primary"}`}
            style={{ width: `${Math.round(state.progress * 100)}%` }}
          />
        </div>
        <p
          className={`mt-2 text-center text-xs font-extrabold ${state.arrived ? "text-success" : "text-primary"}`}
        >
          {state.statusLabel}
        </p>
      </div>
    </Link>
  );
}
