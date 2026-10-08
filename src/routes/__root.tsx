import { redact } from "@/lib/redact";
import "@/lib/failure-capture";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { NetworkStatus } from "../components/NetworkStatus";
import { Toaster } from "../components/ui/sonner";
import { BroadcastBanner } from "../components/BroadcastBanner";
import { AlarmStopper } from "../components/SoundControls";
import { FloatingVoiceAssistant } from "../components/FloatingVoiceWidget";
import { IdleLogout } from "../components/IdleLogout";
import { installGlobalSounds } from "../lib/sounds";
import { installGlobalHaptics, setupStatusBar } from "../lib/native";
import { useTheme } from "../lib/theme";
import { useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(redact(error instanceof Error ? `${error.name}: ${error.message}` : error));
  const router = useRouter();
  useEffect(() => {
    const msg = error instanceof Error ? error.message : String(error);
    if (/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg)) {
      try {
        const last = Number(sessionStorage.getItem("sanad:chunk-reload") || 0);
        if (Date.now() - last > 10000) {
          sessionStorage.setItem("sanad:chunk-reload", String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {}
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "سَنَد — اختر دورك" },
      { name: "description", content: "سَنَد: احجز عند أقرب طبيب واعرف دورك أول بأول." },
      { property: "og:title", content: "سَنَد — اختر دورك" },
      { property: "og:description", content: "سَنَد: احجز عند أقرب طبيب واعرف دورك أول بأول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "سَنَد — اختر دورك" },
      { name: "twitter:description", content: "سَنَد: احجز عند أقرب طبيب واعرف دورك أول بأول." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap",
      },
      { rel: "stylesheet", href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Runs before the app bundle: recovers when the entry or a chunk from an
            older build fails to load (Safari: "Importing a module script failed"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var R=/Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;function go(){try{var k="sanad:chunk-recover",d=JSON.parse(sessionStorage.getItem(k)||"[]").filter(function(t){return Date.now()-t<60000});if(d.length>=2)return;d.push(Date.now());sessionStorage.setItem(k,JSON.stringify(d));var u=new URL(location.href);u.searchParams.set("_r",String(Date.now()));location.replace(u.toString())}catch(e){location.reload()}}addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="SCRIPT"&&t.type==="module"){go();return}if(R.test(String(e.message)))go()},true);addEventListener("unhandledrejection",function(e){var r=e.reason;if(R.test(String(r&&r.message||r)))go()});try{var u=new URL(location.href);if(u.searchParams.has("_r")){u.searchParams.delete("_r");history.replaceState(history.state,"",u.toString())}}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Apply the saved light/dark mode on every page, not only where a toggle is mounted.
  useTheme();

  useEffect(() => {
    installGlobalSounds(toast);
    void setupStatusBar();
    return installGlobalHaptics();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatus />
      <BroadcastBanner />
      <AlarmStopper />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div key={pathname} className="page-enter">
        <Outlet />
      </div>
      <FloatingVoiceAssistant />
      <IdleLogout />
      <Toaster position="top-center" dir="rtl" richColors />
    </QueryClientProvider>
  );
}
