import { createServerFn } from "@tanstack/react-start";

const MODEL = "openai/gpt-oss-120b";
const PROMPT =
  "You are the AI System Diagnostic Assistant for 'سَنَد | SANAD'. Analyze the raw app error/log and respond in JSON with two Arabic fields: `summaryAr` (1 sentence describing what broke) and `solutionAr` (1 sentence recommending the fix).";

type Row = {
  id: string;
  created_at: string;
  screen: string | null;
  message: string;
  summary_ar: string | null;
  solution_ar: string | null;
  resolved: boolean;
};

async function analyze(key: string, r: Row) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: `Screen: ${r.screen ?? "?"}\nError: ${r.message}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const j = await res.json();
  const out = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
  return {
    summary_ar: String(out.summaryAr ?? "").slice(0, 400),
    solution_ar: String(out.solutionAr ?? "").slice(0, 400),
  };
}

// Admin only. Analyzes up to 8 new logs with Groq, then returns the dashboard data.
export const securityScan = createServerFn({ method: "POST" }).handler(async () => {
  const { assertAdminRequest } = await import("./admin-auth.server");
  await assertAdminRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const key = process.env.GROQ_API_KEY;
  let aiError: string | null = null;

  const t0 = Date.now();
  const ping = await supabaseAdmin.from("clinics").select("id", { count: "exact", head: true });
  const dbMs = Date.now() - t0;

  if (key) {
    const { data: pending } = await supabaseAdmin
      .from("app_error_logs")
      .select("*")
      .is("analyzed_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    for (const r of (pending ?? []) as Row[]) {
      try {
        const a = await analyze(key, r);
        await supabaseAdmin
          .from("app_error_logs")
          .update({ ...a, analyzed_at: new Date().toISOString() })
          .eq("id", r.id);
      } catch (e) {
        aiError = (e as Error).message;
        break; // stop on first failure (rate limit / bad key) — no retries
      }
    }
  }

  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [rows, active] = await Promise.all([
    supabaseAdmin
      .from("app_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("app_error_logs")
      .select("id", { count: "exact", head: true })
      .eq("resolved", false)
      .gte("created_at", dayAgo),
  ]);
  const activeCount = active.count ?? 0;
  // Each active error in the last 24h costs 2 points; DB down = 0.
  const health = ping.error ? 0 : Math.max(0, 100 - activeCount * 2);
  return {
    hasKey: !!key,
    aiError,
    dbOk: !ping.error,
    dbMs,
    activeCount,
    health,
    checkedAt: new Date().toISOString(),
    rows: (rows.data ?? []) as Row[],
  };
});

export const resolveErrorLog = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id).slice(0, 40) }))
  .handler(async ({ data }) => {
    const { assertAdminRequest } = await import("./admin-auth.server");
    await assertAdminRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_error_logs").update({ resolved: true }).eq("id", data.id);
    return { ok: true };
  });
