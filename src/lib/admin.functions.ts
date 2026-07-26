import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

type GateSession = { unlocked?: boolean };

function getSessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password) throw new Error("SESSION_SECRET is not set");
  return {
    password,
    name: "sandi-admin-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

async function assertAdmin() {
  const session = await useSession<GateSession>(getSessionConfig());
  if (session.data.unlocked !== true) {
    throw new Error("Unauthorized");
  }
}

export const adminListClinics = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { rows: data ?? [] };
});

export const adminVerifyClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ is_verified: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteClinic = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data || typeof data.id !== "string") throw new Error("Invalid input");
    return { id: data.id };
  })
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("clinics").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  await assertAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [clinics, bookings] = await Promise.all([
    supabaseAdmin.from("clinics").select("id, is_verified"),
    supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }),
  ]);
  const rows = (clinics.data ?? []) as { is_verified: boolean }[];
  return {
    total: rows.length,
    verified: rows.filter((r) => r.is_verified).length,
    pending: rows.filter((r) => !r.is_verified).length,
    bookings: bookings.count ?? 0,
  };
});