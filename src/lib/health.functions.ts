import { createServerFn } from "@tanstack/react-start";

const clip = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, n);

// Public: any screen can report a failed save. Inputs are clipped; nothing is returned.
export const reportSaveFailure = createServerFn({ method: "POST" })
  .inputValidator((d: { action?: string; message?: string; path?: string }) => ({
    action: clip(d?.action || "unknown", 80),
    message: clip(d?.message || "خطأ غير معروف", 300),
    path: clip(d?.path, 120),
  }))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // simple flood guard: max 30 reports per minute overall
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count } = await supabaseAdmin.from("save_failures").select("id", { count: "exact", head: true }).gte("created_at", since);
      if ((count ?? 0) < 30) await supabaseAdmin.from("save_failures").insert(data);
    } catch {
      /* never break the caller */
    }
    return { ok: true as const };
  });

export const adminDbHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { assertAdminRequest } = await import("./admin-auth.server");
  await assertAdminRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const t0 = Date.now();
  const ping = await supabaseAdmin.from("clinics").select("id", { count: "exact", head: true });
  const latencyMs = Date.now() - t0;
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [recent, lastHour, lastDay] = await Promise.all([
    supabaseAdmin.from("save_failures").select("*").order("created_at", { ascending: false }).limit(30),
    supabaseAdmin.from("save_failures").select("action").gte("created_at", hourAgo),
    supabaseAdmin.from("save_failures").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
  ]);
  const byAction: Record<string, number> = {};
  for (const r of (lastHour.data ?? []) as { action: string }[]) byAction[r.action] = (byAction[r.action] ?? 0) + 1;
  const repeated = Object.entries(byAction).filter(([, n]) => n >= 3).map(([action, count]) => ({ action, count }));
  return {
    ok: !ping.error,
    error: ping.error?.message ?? null,
    latencyMs,
    checkedAt: new Date().toISOString(),
    lastHour: lastHour.data?.length ?? 0,
    lastDay: lastDay.count ?? 0,
    repeated,
    recent: (recent.data ?? []) as { id: string; created_at: string; action: string; message: string; path: string | null }[],
  };
});
