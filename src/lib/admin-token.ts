import { createMiddleware } from "@tanstack/react-start";

const KEY = "sanad-admin-token";
const LEGACY_KEY = KEY;

export function saveAdminToken(token: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    return false;
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Keep the new session token even if legacy storage is unavailable.
  }
  return true;
}
export function clearAdminToken() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Continue clearing the legacy persistent copy.
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}
function readAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  let token: string | null;
  try {
    token = sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Persistent storage may be unavailable in restricted browser contexts.
  }
  return token;
}

export const attachAdminToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const t = readAdminToken();
  return next({ headers: t ? { "x-admin-token": t } : {} });
});
