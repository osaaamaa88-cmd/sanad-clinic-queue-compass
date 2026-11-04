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

export async function vibrateForPatientCall() {
  if (isNative()) {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.vibrate({ duration: 600 });
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([300, 120, 300]);
  }
}

export async function notifyLocal(title: string, body: string) {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const permission = await LocalNotifications.checkPermissions();
    const result =
      permission.display === "granted" ? permission : await LocalNotifications.requestPermissions();
    if (result.display !== "granted") return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashId(`patient-call-${Date.now()}`),
          title,
          body,
          schedule: { at: new Date(Date.now() + 250) },
        },
      ],
    });
    return true;
  }

  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  new Notification(title, { body, icon: "/favicon.ico" });
  return true;
}

export async function notifyPatientCall(title: string, body: string) {
  return notifyLocal(title, body);
}

export async function setupStatusBar(mode: "dark" | "light" = "dark") {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    const isLight = mode === "light";
    await StatusBar.setBackgroundColor({ color: isLight ? "#F8FAF9" : "#0F172A" });
    await StatusBar.setStyle({ style: isLight ? Style.Light : Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {
    /* ignore */
  }
}

/** Light haptic on every tap of a button / link / tab. */
export function installGlobalHaptics() {
  if (typeof document === "undefined") return () => {};
  const onClick = (e: Event) => {
    const t = (e.target as HTMLElement | null)?.closest?.(
      "button, a, [role='button'], [role='tab']",
    );
    if (t) void hapticLight();
  };
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}

const MED_ACTION_TYPE = "sanad-med";
const MED_TAKEN_KEY = "sanad_meds_taken_v1";

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
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: MED_ACTION_TYPE,
          actions: [
            { id: "taken", title: "أخذت الجرعة" },
            { id: "snooze", title: "تأجيل 15 دقيقة" },
          ],
        },
      ],
    });
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }
    const notifications = meds.flatMap((m) =>
      m.times
        .filter((t) => /^\d{2}:\d{2}$/.test(t))
        .map((t) => {
          const [hour, minute] = t.split(":").map(Number);
          return {
            id: hashId(`${m.id}-${t}`),
            title: `تذكير دواء: ${m.name}`,
            body: `الجرعة: ${m.dose || "-"} — سند`,
            schedule: { on: { hour, minute }, allowWhileIdle: true },
            actionTypeId: MED_ACTION_TYPE,
            extra: { medId: m.id, time: t, name: m.name, dose: m.dose },
          };
        }),
    );
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    /* ignore */
  }
}

/** Android hardware/gesture back: close open dialogs, go back, or double-press to exit on home. */
export function installAndroidBack(toast: (msg: string) => unknown) {
  if (!isNative()) return () => {};
  let lastPress = 0;
  let remove: (() => void) | undefined;
  void import("@capacitor/app")
    .then(async ({ App }) => {
      const h = await App.addListener("backButton", () => {
        const dialog = document.querySelector(
          '[role="dialog"][data-state="open"], [role="dialog"]',
        );
        if (dialog) {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          return;
        }
        const p = window.location.pathname;
        const isRoot = p === "/" || p === "/patient" || p === "/doctor";
        if (!isRoot && window.history.length > 1) {
          window.history.back();
          return;
        }
        const now = Date.now();
        if (now - lastPress < 2000) {
          void App.exitApp();
          return;
        }
        lastPress = now;
        toast("اضغط رجوع مرة تانية للخروج");
      });
      remove = () => void h.remove();
    })
    .catch(() => {});
  return () => remove?.();
}

/** Handle the "taken" / "snooze" buttons on medication notifications. */
export function installMedReminderActions(toast: (msg: string) => unknown) {
  if (!isNative()) return () => {};
  let remove: (() => void) | undefined;
  void import("@capacitor/local-notifications")
    .then(async ({ LocalNotifications }) => {
      const h = await LocalNotifications.addListener(
        "localNotificationActionPerformed",
        async ({ actionId, notification }) => {
          const extra = (notification.extra ?? {}) as {
            medId?: string;
            time?: string;
            name?: string;
            dose?: string;
          };
          if (!extra.medId || !extra.time) return;
          if (actionId === "taken") {
            const now = new Date();
            const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            try {
              const raw = JSON.parse(localStorage.getItem(MED_TAKEN_KEY) || "{}");
              raw[`${day}|${extra.time}|${extra.medId}`] = true;
              localStorage.setItem(MED_TAKEN_KEY, JSON.stringify(raw));
            } catch {
              /* ignore */
            }
            toast(`تم تسجيل جرعة ${extra.name ?? ""}`);
          } else if (actionId === "snooze") {
            await LocalNotifications.schedule({
              notifications: [
                {
                  id: hashId(`snooze-${extra.medId}-${Date.now()}`),
                  title: `تذكير دواء: ${extra.name ?? ""}`,
                  body: `الجرعة: ${extra.dose || "-"} — سند`,
                  schedule: { at: new Date(Date.now() + 15 * 60_000), allowWhileIdle: true },
                  actionTypeId: MED_ACTION_TYPE,
                  extra,
                },
              ],
            });
            toast("هنفكرك تاني بعد 15 دقيقة");
          }
        },
      );
      remove = () => void h.remove();
    })
    .catch(() => {});
  return () => remove?.();
}

/** Open the phone's own share menu (WhatsApp, Telegram…); falls back to copying the link. */
export async function nativeShare(opts: { title: string; text?: string; url: string }) {
  try {
    if (isNative()) {
      const { Share } = await import("@capacitor/share");
      await Share.share({ ...opts, dialogTitle: "مشاركة عبر" });
      return "shared" as const;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(opts);
      return "shared" as const;
    }
  } catch {
    return "cancelled" as const;
  }
  await navigator.clipboard?.writeText(opts.url);
  return "copied" as const;
}
