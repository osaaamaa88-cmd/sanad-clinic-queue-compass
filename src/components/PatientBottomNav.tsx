import { Link, useRouterState } from "@tanstack/react-router";
import { CircleUserRound, House, Search, Siren, UsersRound } from "lucide-react";

const items = [
  { to: "/patient", label: "الرئيسية", icon: House, matches: (path: string) => path === "/patient" || path === "/patient/" },
  { to: "/patient/search", label: "البحث", icon: Search, matches: (path: string) => path.startsWith("/patient/search") || path.startsWith("/patient/clinic/") },
  { to: "/community", label: "المجتمع", icon: UsersRound, matches: (path: string) => path.startsWith("/community") },
  { to: "/patient/emergency", label: "الطوارئ", icon: Siren, matches: (path: string) => path.startsWith("/patient/emergency") },
  { to: "/patient/login", label: "حسابي", icon: CircleUserRound, matches: (path: string) => path.startsWith("/patient/login") || path.startsWith("/patient/health") || path.startsWith("/patient/meds") || path.startsWith("/messages") },
] as const;

export function PatientBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav
      aria-label="التنقل الرئيسي للمريض"
      data-bottom-nav className="fixed inset-x-0 bottom-0 z-[80] border-t border-border/40 bg-card/90 pb-[env(safe-area-inset-bottom)] shadow-soft backdrop-blur-2xl backdrop-saturate-150"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5 px-1">
        {items.map((item) => {
          const active = item.matches(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all duration-200 active:scale-90 ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className={`absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity ${active ? "opacity-100" : "opacity-0"}`} />
              <span className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${active ? "bg-primary-soft" : "bg-transparent group-hover:bg-secondary"}`}>
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