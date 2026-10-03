import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: notifications for one patient device key. */
export const svrListPatientNotifications = createServerFn({ method: "POST" })
  .inputValidator((data: { recipientKey: string }) => ({
    recipientKey: String(data?.recipientKey ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    data.recipientKey = await (await import("@/lib/device-key.server")).deviceIdentity(data.recipientKey);
    if (!data.recipientKey) return { items: [], unread: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, url, kind, is_read, created_at")
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .order("created_at", { ascending: false })
      .limit(40);
    const items = rows ?? [];
    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        url: n.url ?? "",
        kind: n.kind ?? "info",
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      unread: items.filter((n) => !n.is_read).length,
    };
  });

/** Clinic staff: notifications for the clinic (new bookings…). */
export const svrListClinicNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { data: rows } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, url, kind, is_read, created_at")
      .eq("audience", "clinic")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(40);
    const items = rows ?? [];
    return {
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        url: n.url ?? "",
        kind: n.kind ?? "info",
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
      unread: items.filter((n) => !n.is_read).length,
    };
  });

/** Mark a patient's notifications read (device key scoped). */
export const svrMarkPatientNotificationsRead = createServerFn({ method: "POST" })
  .inputValidator((data: { recipientKey: string }) => ({
    recipientKey: String(data?.recipientKey ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    data.recipientKey = await (await import("@/lib/device-key.server")).deviceIdentity(data.recipientKey);
    if (!data.recipientKey) return { ok: true as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .eq("is_read", false);
    return { ok: true as const };
  });

/** Clinic staff: mark clinic notifications read. */
export const svrMarkClinicNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("audience", "clinic")
      .eq("clinic_id", data.clinicId)
      .eq("is_read", false);
    return { ok: true as const };
  });

/**
 * Public: patient turn watcher. Creates a "your turn is close" notification once
 * per (device, clinic, queue number, threshold) so the patient is warned in time.
 */
export const svrCheckQueueProximity = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string; recipientKey: string; queueNumber: number }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return {
      clinicId: data.clinicId,
      recipientKey: String(data.recipientKey ?? "").slice(0, 80),
      queueNumber: Math.max(0, Math.floor(Number(data.queueNumber) || 0)),
    };
  })
  .handler(async ({ data }) => {
    data.recipientKey = await (await import("@/lib/device-key.server")).deviceIdentity(data.recipientKey);
    if (!data.recipientKey || !data.queueNumber) return { notified: false, ahead: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("doctor, now_serving")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (!clinic) return { notified: false, ahead: null };
    const ahead = Math.max(0, data.queueNumber - (clinic.now_serving ?? 0) - 1);
    if (ahead > 2) return { notified: false, ahead };

    const title = ahead === 0 ? "دورك دلوقتي! 🎉" : `تبقى ${ahead} مرضى على دورك ⏳`;
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .eq("clinic_id", data.clinicId)
      .eq("kind", "queue")
      .eq("title", title)
      .limit(1);
    if (existing && existing.length) return { notified: false, ahead };

    await supabaseAdmin.from("notifications").insert({
      audience: "patient",
      recipient_key: data.recipientKey,
      clinic_id: data.clinicId,
      title,
      body: `عيادة ${clinic.doctor ?? ""} — رقم دورك ${data.queueNumber}`,
      url: `/patient/queue/${data.clinicId}`,
      kind: "queue",
    });
    return { notified: true, ahead };
  });