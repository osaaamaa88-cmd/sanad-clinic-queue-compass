import { QueryClient, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { reportSaveFailure } from "@/lib/health.functions";

export const getRouter = () => {
  const queryClient = new QueryClient({
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
