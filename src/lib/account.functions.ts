import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin() {
  const { assertAdminRequest } = await import("./admin-auth.server");
  await assertAdminRequest();
}

/** Files the user's own device stores — cleared locally on account deletion. */
export const LOCAL_PATIENT_KEYS = [
  "sanad.patient.session",
  "sanad.patient.bookings",
  "sanady.patient.session",
  "sanady.patient.bookings",
];

export const svrRequestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { phone?: string }) => {
    const phone =
      data && typeof data.phone === "string" ? data.phone.replace(/[^\d+]/g, "").slice(0, 20) : "";
    return { phone };
  })
  .handler(async ({ data, context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";

    const { data: existing } = await context.supabase
      .from("deletion_requests")
      .select("id, status, created_at")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true as const, alreadyPending: true as const, id: existing.id };

    const { data: row, error } = await context.supabase
      .from("deletion_requests")
      .insert({ user_id: context.userId, email, phone: data.phone })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, alreadyPending: false as const, id: row.id };
  });

export const svrMyDeletionRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("deletion_requests")
      .select("id, status, created_at, processed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { request: data ?? null };
  });

export const svrCancelDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("deletion_requests")
      .update({ status: "cancelled" })
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListDeletionRequests = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("deletion_requests")
    .select("id, user_id, email, phone, status, created_at, processed_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
});

export const adminResolveDeletionRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string" || data.id.length > 60) throw new Error("Invalid input");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("deletion_requests")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
