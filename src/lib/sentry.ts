import { redact } from "@/lib/redact";

// Public DSN (safe to ship in the browser bundle).
const SENTRY_DSN =
  "https://8504fd47943ecbd551a2c2767ce13566@o4512363940020224.ingest.us.sentry.io/4512365306380288";

let started = false;

/** Call from a useEffect: loads Sentry after hydration and scrubs personal data. */
export async function initSentry() {
  if (started || typeof window === "undefined") return;
  started = true;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: location.hostname.includes("id-preview") ? "preview" : "production",
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [/ResizeObserver loop/i, /^Script error\.?$/i],
    beforeSend(event) {
      if (event.message) event.message = redact(event.message);
      event.exception?.values?.forEach((v) => {
        if (v.value) v.value = redact(v.value);
      });
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
}

export async function captureToSentry(error: unknown) {
  if (!started) return;
  const Sentry = await import("@sentry/react");
  Sentry.captureException(error);
}
