// PostHog product analytics. Browser-only; loaded after hydration.
// Privacy: no session recording, no input capture, paths are scrubbed of IDs.
// Analytics are OPT-IN: nothing is initialized or sent until the user consents
// via setAnalyticsConsent(true) (الإعدادات ← تحسين التطبيق).
type PH = typeof import("posthog-js").default;
let ph: PH | null = null;
let consented = false;

export const ANALYTICS_CONSENT_KEY = "sanad_analytics_consent";

/** Opt-in state. When false, PostHog is never loaded and events are dropped. */
export function analyticsConsented(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "1";
}

/** Reads persisted consent at startup — call once before first capture attempt. */
export function loadAnalyticsConsent(): boolean {
  consented = analyticsConsented();
  return consented;
}

/** Opt-in/out toggle. Opting out stops the loaded client immediately. */
export function setAnalyticsConsent(allowed: boolean) {
  if (typeof window === "undefined") return;
  consented = allowed;
  if (allowed) localStorage.setItem(ANALYTICS_CONSENT_KEY, "1");
  else localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  if (!allowed && ph) {
    ph.opt_out_capturing();
    ph = null;
  }
  if (allowed) void initAnalytics();
}

function allowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!consented) consented = analyticsConsented();
  return consented;
}

export function scrubPath(path: string): string {
  return path
    .split("?")[0]
    .split("#")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/\d{3,}(?=\/|$)/g, "/:id");
}

async function ensureAnalytics(): Promise<PH | null> {
  if (!allowed()) return null;
  if (ph) return ph;
  const token = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!token) return null;
  const region = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string) || "eu";
  const { default: posthog } = await import("posthog-js");
  if (!allowed()) return null; // consent may have been revoked during import
  posthog.init(token, {
    api_host: region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
    capture_pageview: false,
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    autocapture: { dom_event_allowlist: ["click"], element_allowlist: ["a", "button"] },
    person_profiles: "identified_only",
    sanitize_properties: (props) => {
      for (const k of ["$current_url", "$pathname", "$referrer"]) {
        if (typeof props[k] === "string") {
          try {
            const u = new URL(props[k], window.location.origin);
            props[k] = u.origin + scrubPath(u.pathname);
          } catch {
            props[k] = scrubPath(props[k]);
          }
        }
      }
      return props;
    },
  });
  ph = posthog;
  return ph;
}

export async function initAnalytics() {
  await ensureAnalytics();
}

/** Safe capture: silently drops events when the user never consented. */
export function track(event: string, props?: Record<string, string | number | boolean>) {
  void ensureAnalytics().then((client) => client?.capture(event, props));
}

export function trackPage(path: string) {
  void ensureAnalytics().then((client) =>
    client?.capture("$pageview", { $pathname: scrubPath(path) }),
  );
}
