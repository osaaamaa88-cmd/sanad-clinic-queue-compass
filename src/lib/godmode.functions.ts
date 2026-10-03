import { createServerFn } from "@tanstack/react-start";

const PAGE = 20;

async function admin() {
  const { assertAdminRequest } = await import("./admin-auth.server");
  await assertAdminRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const pageInput = (d: { page?: number; q?: string }) => ({
  page: Math.max(0, Math.floor(Number(d?.page) || 0)),
  q: typeof d?.q === "string" ? d.q.slice(0, 100) : "",
});
const idInput = (d: { id: string }) => {
  if (!d || typeof d.id !== "string") throw new Error("Invalid input");
  return { id: d.id };
};

/* ---------- Public: broadcast banner + maintenance ---------- */
export const getAppSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const sb = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await sb.from("app_settings").select("maintenance, broadcast, broadcast_tone, updated_at").eq("id", 1).maybeSingle();
  return data ?? { maintenance: false, broadcast: "", broadcast_tone: "info", updated_at: "" };
});

export const godSetSettings = createServerFn({ method: "POST" })
  .inputValidator((d: { maintenance?: boolean; broadcast?: string; tone?: string }) => ({
    maintenance: typeof d?.maintenance === "boolean" ? d.maintenance : undefined,
    broadcast: typeof d?.broadcast === "string" ? d.broadcast.slice(0, 300) : undefined,
    tone: ["info", "warn", "urgent"].includes(d?.tone ?? "") ? d.tone : undefined,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const patch: { updated_at: string; maintenance?: boolean; broadcast?: string; broadcast_tone?: string } = { updated_at: new Date().toISOString() };
    if (data.maintenance !== undefined) patch.maintenance = data.maintenance;
    if (data.broadcast !== undefined) patch.broadcast = data.broadcast;
    if (data.tone) patch.broadcast_tone = data.tone;
    const { error } = await sb.from("app_settings").update(patch).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------- Users ---------- */
export const godListUsers = createServerFn({ method: "GET" })
  .inputValidator(pageInput)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: res, error } = await sb.auth.admin.listUsers({ page: data.page + 1, perPage: PAGE });
    if (error) throw new Error(error.message);
    const users = res.users;
    const ids = users.map((u) => u.id);
    const [owners, staff] = await Promise.all([
      ids.length ? sb.from("clinics").select("id, owner_id, doctor").in("owner_id", ids) : Promise.resolve({ data: [] }),
      ids.length ? sb.from("clinic_staff").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] }),
    ]);
    const ownerMap = new Map((owners.data ?? []).map((o: any) => [o.owner_id, o.doctor]));
    const staffMap = new Map((staff.data ?? []).map((s: any) => [s.user_id, s.role]));
    const q = data.q.toLowerCase();
    const rows = users
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        phone: u.phone ?? "",
        name: (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || "",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        banned: !!(u as any).banned_until && new Date((u as any).banned_until).getTime() > Date.now(),
        role: ownerMap.has(u.id) ? "doctor" : staffMap.has(u.id) ? "secretary" : "patient",
        clinic: ownerMap.get(u.id) ?? "",
      }))
      .filter((r) => !q || `${r.email} ${r.name} ${r.phone}`.toLowerCase().includes(q));
    return { rows, hasMore: users.length === PAGE };
  });

export const godSuspendUser = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; suspend: boolean }) => ({ ...idInput(d), suspend: !!d.suspend }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.auth.admin.updateUserById(data.id, { ban_duration: data.suspend ? "876000h" : "none" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const godDeleteUser = createServerFn({ method: "POST" })
  .inputValidator(idInput)
  .handler(async ({ data }) => {
    const sb = await admin();
    await sb.from("clinics").update({ owner_id: null, is_disabled: true }).eq("owner_id", data.id);
    await sb.from("clinic_staff").delete().eq("user_id", data.id);
    const { error } = await sb.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const godSetFeatured = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; featured: boolean }) => ({ ...idInput(d), featured: !!d.featured }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("clinics").update({ is_featured: data.featured }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------- Bookings ---------- */
export const godListBookings = createServerFn({ method: "GET" })
  .inputValidator(pageInput)
  .handler(async ({ data }) => {
    const sb = await admin();
    let query = sb
      .from("bookings")
      .select("id, code, clinic_id, patient_name, patient_phone, day_label, slot, queue_number, status, created_at, clinics(doctor)")
      .order("created_at", { ascending: false })
      .range(data.page * PAGE, data.page * PAGE + PAGE - 1);
    if (data.q) query = query.or(`patient_name.ilike.%${data.q.replace(/[%,()]/g, "")}%,code.ilike.%${data.q.replace(/[%,()]/g, "")}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], hasMore: (rows ?? []).length === PAGE };
  });

export const godUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status?: string; dayLabel?: string; slot?: string }) => ({
    ...idInput(d),
    status: ["waiting", "in", "done", "cancelled"].includes(d?.status ?? "") ? d.status : undefined,
    dayLabel: typeof d?.dayLabel === "string" ? d.dayLabel.slice(0, 60) : undefined,
    slot: typeof d?.slot === "string" ? d.slot.slice(0, 30) : undefined,
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const patch: { status?: string; day_label?: string; slot?: string } = {};
    if (data.status) patch.status = data.status;
    if (data.dayLabel !== undefined) patch.day_label = data.dayLabel;
    if (data.slot !== undefined) patch.slot = data.slot;
    const { error } = await sb.from("bookings").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------- Media moderation ---------- */
export const godListMedia = createServerFn({ method: "GET" })
  .inputValidator((d: { page?: number; kind?: string }) => ({
    ...pageInput(d),
    kind: d?.kind === "stories" ? "stories" : d?.kind === "youtube" ? "youtube" : "posts",
  }))
  .handler(async ({ data }) => {
    const sb = await admin();
    const from = data.page * PAGE;
    const to = from + PAGE - 1;
    if (data.kind === "youtube") {
      const { data: rows } = await sb
        .from("clinics").select("id, doctor, youtube_url").neq("youtube_url", "")
        .order("updated_at", { ascending: false }).range(from, to);
      return {
        rows: (rows ?? []).map((r: any) => ({ id: r.id, clinicId: r.id, doctor: r.doctor, url: r.youtube_url, mediaType: "youtube", caption: "", createdAt: "" })),
        hasMore: (rows ?? []).length === PAGE,
      };
    }
    const table = data.kind === "stories" ? "clinic_stories" : "clinic_posts";
    const { data: rows, error } = await sb
      .from(table).select("id, clinic_id, media_url, media_type, caption, created_at, clinics(doctor)")
      .order("created_at", { ascending: false }).range(from, to);
    if (error) throw new Error(error.message);
    const { signMediaRefs } = await import("@/lib/media-sign.server");
    const signed = await signMediaRefs(sb, (rows ?? []).map((r: any) => r.media_url));
    return {
      rows: (rows ?? []).map((r: any) => ({
        id: r.id, clinicId: r.clinic_id, doctor: r.clinics?.doctor ?? "",
        url: signed.get(r.media_url) ?? "", mediaType: r.media_type, caption: r.caption, createdAt: r.created_at,
      })),
      hasMore: (rows ?? []).length === PAGE,
    };
  });

export const godDeleteMedia = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; kind: string }) => ({ ...idInput(d), kind: d.kind }))
  .handler(async ({ data }) => {
    const sb = await admin();
    if (data.kind === "youtube") {
      const { error } = await sb.from("clinics").update({ youtube_url: "" }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    if (data.kind === "posts") {
      await sb.from("clinic_post_comments").delete().eq("post_id", data.id);
      await sb.from("clinic_post_likes").delete().eq("post_id", data.id);
    }
    const table = data.kind === "stories" ? "clinic_stories" : "clinic_posts";
    const { data: row } = await sb.from(table).select("media_url").eq("id", data.id).maybeSingle();
    const { error } = await sb.from(table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const ref = (row as any)?.media_url as string | undefined;
    if (ref && !ref.startsWith("http")) {
      if (ref.startsWith("avatars:")) await sb.storage.from("avatars").remove([ref.slice(8)]);
      else await sb.storage.from("clinic-media").remove([ref]);
    }
    return { ok: true as const };
  });
