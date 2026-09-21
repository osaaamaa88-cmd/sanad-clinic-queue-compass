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
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-md sm:max-w-xl lg:max-w-2xl"}`}>
        <header
          className={`sticky top-0 z-50 grid items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4 ${centeredTitle ? "grid-cols-[1fr_minmax(0,2fr)_1fr]" : "grid-cols-[auto_minmax(0,1fr)_auto]"} ${
            isPrimary ? "gradient-primary text-primary-foreground" : "border-b border-border bg-card"
          }`}
        >
          {hideBack ? <span className="h-10 w-10" aria-hidden="true" /> : (
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
            {showThemeToggle && <ThemeToggle className={isPrimary ? "border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground" : ""} />}
          </div>
        </header>
        <main className={`px-4 py-4 pb-24 sm:px-6 sm:py-6 ${wide ? "lg:px-8" : ""}`}>{children}</main>
      </div>
    </div>
  );
}