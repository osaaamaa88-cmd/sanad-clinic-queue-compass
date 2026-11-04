import { Link, useRouterState } from "@tanstack/react-router";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { CircleUserRound, House, Search, Siren, UsersRound } from "lucide-react";

const items = [
  {
    to: "/patient",
    label: "الرئيسية",
    icon: House,
    matches: (path: string) => path === "/patient" || path === "/patient/",
  },
  {
    to: "/patient/search",
    label: "البحث",
    icon: Search,
    matches: (path: string) =>
      path.startsWith("/patient/search") || path.startsWith("/patient/clinic/"),
  },
  {
    to: "/community",
    label: "المجتمع",
    icon: UsersRound,
    matches: (path: string) => path.startsWith("/community"),
  },
  {
    to: "/patient/emergency",
    label: "الطوارئ",
    icon: Siren,
    matches: (path: string) => path.startsWith("/patient/emergency"),
  },
  {
    to: "/patient/login",
    label: "حسابي",
    icon: CircleUserRound,
    matches: (path: string) =>
      path.startsWith("/patient/login") ||
      path.startsWith("/patient/health") ||
      path.startsWith("/patient/meds") ||
      path.startsWith("/patient/drug-scan") ||
      path.startsWith("/patient/lab-reader") ||
      path.startsWith("/nutrition") ||
      path.startsWith("/messages"),
  },
] as const;

export function PatientBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hidden = useHideOnScroll();

  return (
    <nav
      aria-label="التنقل الرئيسي للمريض"
      data-bottom-nav
      data-hidden={hidden || undefined}
      className={`dock-autohide pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] mb-3 ${hidden ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"}`}
    >
      {/* شريط التنقل السفلي — كبسولة زجاج سائل عائمة (Liquid Glass Dock) */}
      <div className={`glass-liquid glass-dock grid ${hidden ? "pointer-events-none" : "pointer-events-auto"} h-16 w-full max-w-md grid-cols-5 rounded-full px-2`}>
        {items.map((item) => {
          const active = item.matches(pathname);
          const emergency = item.to === "/patient/emergency";
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 text-xs font-bold transition-all duration-200 active:scale-90 ${emergency ? "text-destructive" : active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span
                className={`grid h-9 w-14 place-items-center rounded-full transition-all duration-300 ${
                  emergency && active
                    ? "bg-destructive/10 text-destructive shadow-xs"
                    : active
                      ? "bg-primary-soft text-primary shadow-xs ring-1 ring-primary/10"
                      : "bg-transparent group-hover:bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
