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
