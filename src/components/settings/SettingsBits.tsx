import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { DEFAULT_PREFS, PREFS_EVENT, readPrefs, setPref, type AppPrefs } from "@/lib/app-prefs";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 space-y-3 first:mt-0">
      <h2 className="px-1 text-sm font-extrabold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function SwitchRow({
  icon: Icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="h-6 w-6 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-sm font-bold">{title}</span>
          {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-11 shrink-0 accent-primary"
      />
    </label>
  );
}

export function LinkRow({
  icon: Icon,
  title,
  hint,
  to,
  params,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  to: string;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to as never}
      params={params as never}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
    >
      <Icon className="h-6 w-6 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

/** Reactive device preferences; reads after hydration to avoid mismatches. */
export function usePrefs(): [AppPrefs, <K extends keyof AppPrefs>(k: K, v: AppPrefs[K]) => void] {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    return () => window.removeEventListener(PREFS_EVENT, sync);
  }, []);
  return [prefs, (k, v) => setPrefs(setPref(k, v))];
}
