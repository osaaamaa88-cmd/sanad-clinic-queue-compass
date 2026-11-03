import { createFileRoute } from "@tanstack/react-router";

// Public uptime check for monitors (UptimeRobot / Better Stack). Returns no private data.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let db = "ok";
        try {
          const url = process.env.SUPABASE_URL;
          const key = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const res = await fetch(`${url}/auth/v1/health`, {
              headers: { apikey: key },
              signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) db = "down";
          }
        } catch {
          db = "down";
        }
        const ok = db === "ok";
        return Response.json(
          { status: ok ? "ok" : "degraded", db, ms: Date.now() - started },
          { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
