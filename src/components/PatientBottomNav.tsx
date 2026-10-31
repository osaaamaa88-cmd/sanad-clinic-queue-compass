import { Link, useRouterState } from "@tanstack/react-router";
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
      path.startsWith("/messages"),
  },
] as const;

export function PatientBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="التنقل الرئيسي للمريض"
      data-bottom-nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] mb-3"
    >
      {/* شريط التنقل السفلي — كبسولة زجاج سائل عائمة (Liquid Glass Dock) */}
      <div className="glass-liquid pointer-events-auto grid h-16 w-full max-w-md grid-cols-5 rounded-full px-2 shadow-lg">
        {items.map((item) => {
          const active = item.matches(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all duration-200 active:scale-90 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span
                className={`grid h-9 w-14 place-items-center rounded-full transition-all duration-300 ${active ? "bg-primary-soft shadow-soft" : "bg-transparent group-hover:bg-secondary"}`}
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
