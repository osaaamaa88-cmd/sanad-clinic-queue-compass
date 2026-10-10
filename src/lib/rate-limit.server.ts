// Per-client rate limit for paid AI calls: 10 requests / minute per IP (per server instance).
const buckets = new Map<string, number[]>();
export const AI_LIMIT_PER_MIN = 10;

export async function assertAiRateLimit(scope: string) {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const ip = (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0] || "anon").trim();
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= AI_LIMIT_PER_MIN) {
    buckets.set(key, list);
    throw new Error("RATE_LIMITED: طلبات كتير ورا بعض، استنى دقيقة وجرب تاني.");
  }
  list.push(now);
  buckets.set(key, list);
  if (buckets.size > 5000) buckets.clear();
}
