// PostHog product analytics. Browser-only; loaded after hydration.
// Privacy: no session recording, no input capture, paths are scrubbed of IDs.
type PH = typeof import("posthog-js").default;
let ph: PH | null = null;

export function scrubPath(path: string): string {
  return path
    .split("?")[0]
    .split("#")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/\d{3,}(?=\/|$)/g, "/:id");
}

export async function initAnalytics() {
  if (typeof window === "undefined" || ph) return;
  const token = import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY as string | undefined;
  if (!token) return;
  const region = (import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION as string) || "eu";
  const { default: posthog } = await import("posthog-js");
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
}

export function trackPage(path: string) {
  ph?.capture("$pageview", { $pathname: scrubPath(path) });
}

export function track(event: string, props?: Record<string, string | number | boolean>) {
  ph?.capture(event, props);
}
