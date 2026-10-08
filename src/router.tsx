import { QueryClient, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { reportSaveFailure } from "@/lib/health.functions";

// After an app update, an open tab may request old code chunks that no longer
// exist ("Importing a module script failed"). Reload once to fetch fresh code.
const STALE_RE = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
function reloadOnceForStaleChunk() {
  try {
    const last = Number(sessionStorage.getItem("sanad:chunk-reload") || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem("sanad:chunk-reload", String(Date.now()));
  } catch {}
  window.location.reload();
}
if (typeof window !== "undefined") {
  // Don't preventDefault: that makes the failed import resolve to `undefined`,
  // which crashes the lazy route ("undefined is not an object (e[t??'default'])").
  window.addEventListener("vite:preloadError", () => {
    reloadOnceForStaleChunk();
  });
  window.addEventListener("error", (e) => {
    if (STALE_RE.test(String(e.message))) reloadOnceForStaleChunk();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    if (STALE_RE.test(msg)) reloadOnceForStaleChunk();
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 60 * 1000, gcTime: 2 * 60 * 60 * 1000, refetchOnWindowFocus: false } },
    mutationCache: new MutationCache({
      onError: (error, _v, _c, mutation) => {
        if (typeof window === "undefined") return;
        reportSaveFailure({
          data: {
            action: String(mutation.options.mutationKey?.join(":") ?? "حفظ"),
            message: error instanceof Error ? error.message : String(error),
            path: window.location.pathname,
          },
        }).catch(() => {});
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
