/**
 * Turns the browser's secret device key into the identity stored in the DB.
 * The raw key never gets stored, so stored ids can't be replayed, and short /
 * guessable keys are rejected.
 */
export async function deviceIdentity(raw: string | undefined | null): Promise<string> {
  const key = String(raw ?? "").trim();
  if (key.length < 24 || key.length > 80) return "";
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SESSION_KEY;
  if (!secret) throw new Error("Server misconfigured");
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`device:${key}`)));
  return "d1:" + Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}

/** Unpredictable short code (e.g. booking codes). */
export function randomCode(len = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
