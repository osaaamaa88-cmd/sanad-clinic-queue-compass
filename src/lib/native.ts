// Native (Capacitor) helpers — safe no-ops on the web.
import { Capacitor } from "@capacitor/core";

export const isNative = () => typeof window !== "undefined" && Capacitor.isNativePlatform();

export async function hapticLight() {
  try {
    if (isNative()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
  } catch {
    /* ignore */
  }
}

export async function setupStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color: "#0F172A" });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* ignore */
  }
}

/** Light haptic on every tap of a button / link / tab. */
export function installGlobalHaptics() {
  if (typeof document === "undefined") return () => {};
  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement | null)?.closest?.("button, a, [role='button'], [role='tab']");
    if (t) void hapticLight();
  };
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}

type NativeMed = { id: string; name: string; dose: string; times: string[] };

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2_000_000_000;
}

/** Schedule daily OS-level medication reminders (rings even when the app is closed). */
export async function syncNativeMedReminders(meds: NativeMed[]) {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const r = await LocalNotifications.requestPermissions();
      if (r.display !== "granted") return;
    }
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const notifications = meds.flatMap((m) =>
      m.times
        .filter((t) => /^\d{2}:\d{2}$/.test(t))
        .map((t) => {
          const [hour, minute] = t.split(":").map(Number);
          return {
            id: hashId(`${m.id}-${t}`),
            title: `تذكير دواء: ${m.name}`,
            body: `الجرعة: ${m.dose || "-"} — سَنَد`,
            schedule: { on: { hour, minute }, allowWhileIdle: true },
          };
        }),
    );
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    /* ignore */
  }
}
