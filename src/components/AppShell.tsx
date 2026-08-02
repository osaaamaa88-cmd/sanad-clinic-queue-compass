import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppShell({
  title,
  subtitle,
  backTo = "/",
  right,
  children,
  tone = "light",
  showThemeToggle = true,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
  children: ReactNode;
  tone?: "light" | "primary";
  showThemeToggle?: boolean;
}) {
  const isPrimary = tone === "primary";
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-2xl">
        <header
          className={`sticky top-0 z-10 flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4 ${
            isPrimary ? "gradient-primary text-white" : "bg-card border-b border-border"
          }`}
        >
          <Link
            to={backTo}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
              isPrimary ? "bg-white/20" : "bg-secondary"
            }`}
            aria-label="رجوع"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold sm:text-lg">{title}</h1>
            {subtitle && (
              <p className={`truncate text-[11px] sm:text-xs ${isPrimary ? "opacity-90" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
          {showThemeToggle && <ThemeToggle className={isPrimary ? "border-white/30 bg-white/20 text-white" : ""} />}
        </header>
        <main className="px-4 py-4 pb-24 sm:px-5 sm:py-5">{children}</main>
      </div>
    </div>
  );
}