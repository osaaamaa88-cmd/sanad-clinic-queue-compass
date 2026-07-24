import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({
  title,
  subtitle,
  backTo = "/",
  right,
  children,
  tone = "light",
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: ReactNode;
  children: ReactNode;
  tone?: "light" | "primary";
}) {
  const isPrimary = tone === "primary";
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md">
        <header
          className={`sticky top-0 z-10 flex items-center gap-3 px-5 py-4 ${
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
            <h1 className="truncate text-lg font-extrabold">{title}</h1>
            {subtitle && (
              <p className={`truncate text-xs ${isPrimary ? "opacity-90" : "text-muted-foreground"}`}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
        <main className="px-5 py-5 pb-24">{children}</main>
      </div>
    </div>
  );
}