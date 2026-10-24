import { AlarmClockOff, Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { stopAlarm, useAlarmActive, useSoundOn } from "@/lib/sounds";

/** Settings row: turn app sounds on/off. */
export function SoundToggle() {
  const [on, set] = useSoundOn();
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      role="switch"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-start"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">أصوات التطبيق</span>
        <span className="block text-xs text-muted-foreground">
          {on ? "شغالة — نقر ونجاح وتنبيهات ومنبه" : "مكتومة"}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${on ? "left-0.5" : "left-[22px]"}`}
        />
      </span>
    </button>
  );
}

/** Floating stop button shown anywhere while an alarm is ringing. */
export function AlarmStopper() {
  const active = useAlarmActive();
  if (!active) return null;
  return (
    <button
      onClick={stopAlarm}
      className="fixed inset-x-4 top-4 z-[120] mx-auto flex max-w-md animate-pulse items-center justify-center gap-2 rounded-2xl bg-destructive py-4 text-base font-extrabold text-destructive-foreground shadow-soft"
    >
      <AlarmClockOff className="h-5 w-5" /> إيقاف المنبه
    </button>
  );
}

/** Settings row: light / dark appearance. */
export function ThemeSetting() {
  const { mode, toggle } = useTheme();
  const dark = mode === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-start"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
        {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold">الوضع الداكن</span>
        <span className="block text-xs text-muted-foreground">
          {dark ? "مفعّل" : "الوضع الفاتح"}
        </span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${dark ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${dark ? "left-0.5" : "left-[22px]"}`}
        />
      </span>
    </button>
  );
}
