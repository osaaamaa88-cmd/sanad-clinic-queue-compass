import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { attachAdminToken } from "@/lib/admin-token";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
let envChecked = false;
const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GROQ_API_KEY",
  "SITE_PASSWORD",
  "ADMIN_SESSION_KEY",
];

const securityHeaders = createMiddleware().server(async ({ next }) => {
  if (!envChecked) {
    envChecked = true;
    // Names only — never print values.
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length) console.warn("[security] missing server keys:", missing.join(", "));
  }
  const res = await next();
  try {
    const h =
      (res as { response?: Response }).response?.headers ?? (res as unknown as Response).headers;
    h?.set("X-Content-Type-Options", "nosniff");
    h?.set("Referrer-Policy", "strict-origin-when-cross-origin");
  } catch {
    /* immutable headers */
  }
  return res;
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, attachAdminToken],
  requestMiddleware: [securityHeaders, errorMiddleware, csrfMiddleware],
}));
