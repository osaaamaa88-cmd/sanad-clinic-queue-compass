import { redact } from "@/lib/redact";
import { toast } from "sonner";
import { reportSaveFailure } from "@/lib/health.functions";

declare global {
  interface Window {
    /** Runtime-error listeners installed once (see below). */
    __sanadRt?: boolean;
  }
}

/** Sonner toast object plus the once-only flag for error-toast reporting. */
type SanadToast = typeof toast & { __sanad?: boolean };
const sanadToast: SanadToast = toast;

// Every error toast in the app = a failed user action; log it for the owner's health panel.
if (typeof window !== "undefined" && !sanadToast.__sanad) {
  const orig = toast.error;
  sanadToast.__sanad = true;
  (toast as { error: typeof toast.error }).error = ((msg, opts) => {
    reportSaveFailure({
      data: {
        action: (document.title.split("|")[0] ?? "").trim() || "حفظ",
        message: redact(typeof msg === "function" ? "error" : msg),
        path: location.pathname,
      },
    }).catch(() => {});
    return orig(msg, opts);
  }) as typeof toast.error;
}

// Real runtime errors (uncaught + unhandled rejections) → app_error_logs, deduped per session.
if (typeof window !== "undefined" && !window.__sanadRt) {
  window.__sanadRt = true;
  const seen = new Set<string>();
  const send = (msg: string) => {
    if (!msg || seen.has(msg) || seen.size > 20) return;
    if (/ResizeObserver loop|Script error\.?$/i.test(msg)) return;
    seen.add(msg);
    import("@/lib/voice-assist.functions")
      .then(({ reportRuntimeError }) =>
        reportRuntimeError({
          data: { message: msg, screen: location.pathname, device: navigator.userAgent },
        }),
      )
      .catch(() => {});
  };
  window.addEventListener("error", (e) => send(e.message || String(e.error)));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason as { message?: string } | undefined;
    send(r?.message ?? String(e.reason));
  });
}
