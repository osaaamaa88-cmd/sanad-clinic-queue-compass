import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequestHeader } from "@tanstack/react-start/server";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function key() {
  const k = process.env.ADMIN_SESSION_KEY;
  if (!k) throw new Error("ADMIN_SESSION_KEY is not set");
  return k;
}

export function sessionConfig() {
  return {
    password: key(),
    name: "sanad-admin-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function issueAdminToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || token.length > 500) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// Only the explicit header token is accepted. A browser never attaches custom
// headers cross-site, so this blocks cross-site request forgery; the ambient
// cookie is no longer trusted for admin actions.
export async function isAdminRequest(): Promise<boolean> {
  return verifyAdminToken(getRequestHeader("x-admin-token"));
}

export async function assertAdminRequest() {
  if (!(await isAdminRequest())) throw new Error("Unauthorized");
}
