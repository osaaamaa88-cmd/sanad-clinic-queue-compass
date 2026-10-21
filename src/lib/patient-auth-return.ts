/** Accept only local app destinations, never an external OAuth return URL. */
export function safePatientReturnPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return undefined;
  const url = new URL(value, "https://sanad.local");
  if (url.origin !== "https://sanad.local" || url.pathname === "/patient/login") return undefined;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function patientOAuthCallback(origin: string, currentPath: string): string {
  const callback = new URL("/patient/login", origin);
  const returnTo = safePatientReturnPath(currentPath);
  if (returnTo) callback.searchParams.set("returnTo", returnTo);
  return callback.toString();
}