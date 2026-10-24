import { Link } from "@tanstack/react-router";
import { Stethoscope, UserRound, ArrowLeftRight } from "lucide-react";

const KEY = "sanad_app_mode";
export function rememberMode(mode: "patient" | "doctor") {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Quick switch between the patient and doctor experiences. */
export function ModeSwitch({
  current,
  compact = false,
}: {
  current: "patient" | "doctor";
  compact?: boolean;
}) {
  const toDoctor = current === "patient";
  const Icon = toDoctor ? Stethoscope : UserRound;
  const label = toDoctor ? "واجهة الطبيب" : "واجهة المريض";
  return (
    <Link
      to={toDoctor ? "/doctor" : "/"}
      onClick={() => rememberMode(toDoctor ? "doctor" : "patient")}
      aria-label={`التبديل إلى ${label}`}
      className={
        compact
          ? "flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold text-primary shadow-soft transition active:scale-95"
          : "flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 text-right shadow-soft transition active:scale-95"
      }
    >
      {compact ? (
        <>
          <Icon className="h-4 w-4" />
          {label}
        </>
      ) : (
        <>
          <span className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-extrabold text-foreground">
                التبديل إلى {label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {toDoctor ? "أدوات العيادة والروشتة والطابور" : "البحث عن دكتور والمستشفيات"}
              </span>
            </span>
          </span>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </>
      )}
    </Link>
  );
}
