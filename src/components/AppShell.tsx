import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PatientBottomNav } from "@/components/PatientBottomNav";
import { DoctorBottomNav } from "@/components/DoctorBottomNav";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { currentUserId, unreadCounts } from "@/lib/chat";
import { MessageCircle } from "lucide-react";

export function AppShell({
  title,
  subtitle,
  backTo = "/",
  onBack,
  right,
  children,
  tone = "light",
  wide = false,
  hideBack = false,
  centeredTitle = false,
  fullHeight = false,
  contentClassName = "",
  headerClassName = "",
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  tone?: "light" | "primary";
  showThemeToggle?: boolean;
  wide?: boolean;
  hideBack?: boolean;
  centeredTitle?: boolean;
  fullHeight?: boolean;
  /** كلاسات إضافية للحاوية الرئيسية (مثل content-bottom-fade) */
  contentClassName?: string;
  /** كلاسات إضافية للهيدر */
  headerClassName?: string;
}) {
  const isPrimary = tone === "primary";
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 40) setHidden(false);
      else if (y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const doctorClinicId = useDoctorClinicId();
  const onOwnClinic = !!doctorClinicId && pathname === `/patient/clinic/${doctorClinicId}`;
  const showDoctorNav =
    !!doctorClinicId &&
    (onOwnClinic ||
      pathname.startsWith("/community") ||
      pathname.startsWith("/messages") ||
      pathname.startsWith("/reception") ||
      pathname.startsWith("/doctor"));
  const showPatientNav =
    !showDoctorNav &&
    (pathname.startsWith("/patient") ||
      pathname.startsWith("/community") ||
      pathname.startsWith("/messages"));
  return (
    <div className={`min-h-screen bg-background ${fullHeight ? "h-dvh overflow-hidden" : ""}`}>
      <div
        className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-xl md:max-w-2xl lg:max-w-3xl"} ${fullHeight ? "flex h-full flex-col" : ""}`}
      >
        <header
          className={`sticky inset-x-0 top-0 z-50 grid w-full transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"} min-h-16 items-center gap-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6 sm:pb-4 sm:pt-[max(1rem,env(safe-area-inset-top))] ${fullHeight ? "shrink-0" : ""} ${centeredTitle ? "grid-cols-[2.75rem_minmax(0,1fr)_auto]" : "grid-cols-[auto_minmax(0,1fr)_auto]"} ${
            isPrimary
              ? "gradient-primary text-primary-foreground"
              : "border-b border-border/40 bg-card/70 backdrop-blur-2xl backdrop-saturate-150"
          } ${headerClassName}`}
        >
          {hideBack ? (
            <span className="h-10 w-10 shrink-0" aria-hidden="true" />
          ) : onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="btn-liquid-glass grid h-11 w-11 shrink-0 place-items-center rounded-full"
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            <Link
              to={backTo}
              className="btn-liquid-glass grid h-11 w-11 shrink-0 place-items-center rounded-full"
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <div className={`min-w-0 ${centeredTitle ? "text-center" : ""}`}>
            <h1 className="truncate text-base font-extrabold sm:text-lg">{title}</h1>
            {subtitle && (
              <p
                className={`truncate text-xs ${isPrimary ? "opacity-90" : "text-muted-foreground"}`}
              >
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {right}
            {showPatientNav && !pathname.startsWith("/messages") && <PatientMessagesLink />}
          </div>
        </header>
        <main
          className={`px-4 py-4 ${contentClassName} ${fullHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden pb-4" : `${showPatientNav || showDoctorNav ? "pb-28" : "pb-24"}`} sm:px-6 sm:py-6 ${wide ? "lg:px-8" : ""}`}
        >
          {children}
        </main>
      </div>
      {showPatientNav && <PatientBottomNav />}
      {showDoctorNav && <DoctorBottomNav clinicId={doctorClinicId ?? undefined} />}
    </div>
  );
}

function PatientMessagesLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const uid = await currentUserId();
        if (!uid) {
          if (active) setUnread(0);
          return;
        }
        const counts = await unreadCounts(uid);
        if (active) {
          setUnread(Object.values(counts).reduce((total, count) => total + count, 0));
        }
      } catch (error) {
        console.error("[AppShell] Failed to load unread message count:", error);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <Link
      to="/messages"
      aria-label={unread ? `الرسائل، ${unread} غير مقروءة` : "الرسائل"}
      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-current transition hover:bg-secondary/70"
    >
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -end-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
