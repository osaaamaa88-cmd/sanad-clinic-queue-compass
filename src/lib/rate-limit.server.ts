// Shared rate limiter: Postgres-backed (check_rate_limit) with an in-memory fallback.
const buckets = new Map<string, number[]>();
export const AI_LIMIT_PER_MIN = 10;

export async function clientIp(): Promise<string> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0] ||
    "anon"
  )
    .trim()
    .slice(0, 64);
}

function memoryCheck(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowSec * 1000);
  if (list.length >= limit) {
    buckets.set(key, list);
    return false;
  }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

/** Returns true when allowed. Never throws. */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (!error && typeof data === "boolean") return data;
  } catch {
    /* fall back */
  }
  return memoryCheck(key, limit, windowSec);
}

export async function assertRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  msg = "RATE_LIMITED: طلبات كتير ورا بعض، استنى شوية وجرب تاني.",
) {
  if (!(await checkRateLimit(key, limit, windowSec))) throw new Error(msg);
}

/** AI calls: 10/min per user id (when given) or per IP. */
export async function assertAiRateLimit(scope: string, userId?: string) {
  const who = userId ? `u:${userId}` : `ip:${await clientIp()}`;
  await assertRateLimit(
    `ai:${scope}:${who}`,
    AI_LIMIT_PER_MIN,
    60,
    "RATE_LIMITED: طلبات كتير ورا بعض، استنى دقيقة وجرب تاني.",
  );
}
