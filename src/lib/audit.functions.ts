import { createServerFn } from "@tanstack/react-start";

export type AuditEvent = "login" | "medical_query" | "profile_access" | "appointment_booked";
const EVENTS: AuditEvent[] = ["login", "medical_query", "profile_access", "appointment_booked"];

/** Server-side helper: records an audit event. Never throws. */
export async function writeAudit(event: AuditEvent, userId: string | null, details = "") {
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const ip = (getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for")?.split(",")[0] || "").trim();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs" as never).insert({
      event,
      user_id: userId,
      ip_address: ip.slice(0, 64) || null,
      details: details.slice(0, 200),
    } as never);
  } catch {
    /* never break the caller */
  }
}

/** Client-callable: user id is taken from the verified session token, never from input. */
export const logAudit = createServerFn({ method: "POST" })
  .inputValidator((d: { event: AuditEvent; details?: string }) => {
    if (!EVENTS.includes(d?.event)) throw new Error("bad event");
    return { event: d.event, details: String(d.details ?? "").replace(/<[^>]*>/g, "").slice(0, 200) };
  })
  .handler(async ({ data }) => {
    let userId: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const token = getRequestHeader("authorization")?.replace(/^Bearer\s+/i, "");
      if (token) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        userId = u.user?.id ?? null;
      }
    } catch {
      /* anonymous */
    }
    await writeAudit(data.event, userId, data.details);
    return { ok: true as const };
  });
