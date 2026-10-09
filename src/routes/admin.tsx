import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/admin-access" });
  },
});
