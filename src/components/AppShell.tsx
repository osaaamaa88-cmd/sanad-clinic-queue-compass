import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PatientBottomNav } from "@/components/PatientBottomNav";
import { DoctorBottomNav } from "@/components/DoctorBottomNav";
import { useDoctorClinicId } from "@/lib/use-doctor-mode";

export function AppShell({
  title,
  subtitle,
  backTo = "/",
  right,
  children,
  tone = "light",
  wide = false,
  hideBack = false,
  centeredTitle = false,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
  children: ReactNode;
  tone?: "light" | "primary";
  showThemeToggle?: boolean;
  wide?: boolean;
  hideBack?: boolean;
  centeredTitle?: boolean;
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
    (onOwnClinic || pathname.startsWith("/messages") || pathname.startsWith("/reception") || pathname.startsWith("/doctor"));
  const showPatientNav = !showDoctorNav && (pathname.startsWith("/patient") || pathname.startsWith("/messages"));
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-md sm:max-w-xl lg:max-w-2xl"}`}>
        <header
          className={`sticky inset-x-0 top-0 z-50 grid transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"} min-h-16 items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 ${centeredTitle ? "grid-cols-[5.5rem_minmax(0,1fr)_5.5rem]" : "grid-cols-[auto_minmax(0,1fr)_auto]"} ${
            isPrimary ? "gradient-primary text-primary-foreground" : "border-b border-border bg-card"
          }`}
        >
          {hideBack ? <span className="h-10 w-full" aria-hidden="true" /> : (
            <Link
              to={backTo}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                isPrimary ? "bg-primary-foreground/15" : "bg-secondary"
              }`}
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          <div className={`min-w-0 ${centeredTitle ? "text-center" : ""}`}>
            <h1 className="truncate text-base font-extrabold sm:text-lg">{title}</h1>
            {subtitle && (
              <p className={`truncate text-[11px] sm:text-xs ${isPrimary ? "opacity-90" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {right}
          </div>
        </header>
        <main className={`px-4 py-4 ${showPatientNav || showDoctorNav ? "pb-28" : "pb-24"} sm:px-6 sm:py-6 ${wide ? "lg:px-8" : ""}`}>{children}</main>
      </div>
      {showPatientNav && <PatientBottomNav />}
      {showDoctorNav && <DoctorBottomNav clinicId={doctorClinicId ?? undefined} />}
    </div>
  );
}