import { createMiddleware } from "@tanstack/react-start";

const KEY = "sanad-admin-token";

export function saveAdminToken(t: string) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}
export function clearAdminToken() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
function readAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export const attachAdminToken = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const t = readAdminToken();
  return next({ headers: t ? { "x-admin-token": t } : {} });
});
