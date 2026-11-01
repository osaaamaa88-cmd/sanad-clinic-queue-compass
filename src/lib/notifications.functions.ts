import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function assertNotificationRateLimit(scope: string, identity?: string, limit = 60) {
  const { assertRateLimit, clientIp } = await import("@/lib/rate-limit.server");
  await assertRateLimit(`notifications:${scope}:ip:${await clientIp()}`, limit, 60);
  if (identity) {
    await assertRateLimit(`notifications:${scope}:identity:${identity}`, limit, 60);
  }
}

/** Public: notifications for one patient device key. */
export const svrListPatientNotifications = createServerFn({ method: "POST" })
  .inputValidator((data: { recipientKey: string }) => ({
    recipientKey: String(data?.recipientKey ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    await assertNotificationRateLimit("patient-list");
    data.recipientKey = await (
      await import("@/lib/device-key.server")
    ).deviceIdentity(data.recipientKey);
    if (!data.recipientKey) return { items: [], unread: 0 };
    await assertNotificationRateLimit("patient-list-device", data.recipientKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, url, kind, is_read, created_at")
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      console.error("[svrListPatientNotifications] query failed:", error.message);
      throw new Error("NOTIFICATIONS_LOAD_FAILED");
    }
    const items = rows;
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
    if (!data || typeof data.clinicId !== "string" || !isUuid(data.clinicId)) {
      throw new Error("Invalid input");
    }
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    await assertNotificationRateLimit("clinic-list", context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("notifications")
      .select("id, title, body, url, kind, is_read, created_at")
      .eq("audience", "clinic")
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      console.error("[svrListClinicNotifications] query failed:", error.message);
      throw new Error("NOTIFICATIONS_LOAD_FAILED");
    }
    const items = rows;
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
    await assertNotificationRateLimit("patient-read");
    data.recipientKey = await (
      await import("@/lib/device-key.server")
    ).deviceIdentity(data.recipientKey);
    if (!data.recipientKey) return { ok: true as const };
    await assertNotificationRateLimit("patient-read-device", data.recipientKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .eq("is_read", false);
    if (error) {
      console.error("[svrMarkPatientNotificationsRead] update failed:", error.message);
      throw new Error("NOTIFICATIONS_UPDATE_FAILED");
    }
    return { ok: true as const };
  });

/** Clinic staff: mark clinic notifications read. */
export const svrMarkClinicNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string" || !isUuid(data.clinicId)) {
      throw new Error("Invalid input");
    }
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    await assertNotificationRateLimit("clinic-read", context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("audience", "clinic")
      .eq("clinic_id", data.clinicId)
      .eq("is_read", false);
    if (error) {
      console.error("[svrMarkClinicNotificationsRead] update failed:", error.message);
      throw new Error("NOTIFICATIONS_UPDATE_FAILED");
    }
    return { ok: true as const };
  });

/**
 * Public: patient turn watcher. Creates a "your turn is close" notification once
 * per (device, clinic, queue number, threshold) so the patient is warned in time.
 */
export const svrCheckQueueProximity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string; recipientKey: string; queueNumber: number }) => {
    if (
      !data ||
      typeof data.clinicId !== "string" ||
      !isUuid(data.clinicId) ||
      typeof data.recipientKey !== "string" ||
      data.recipientKey.length > 80 ||
      !Number.isSafeInteger(data.queueNumber) ||
      data.queueNumber < 1
    ) {
      throw new Error("Invalid input");
    }
    return {
      clinicId: data.clinicId,
      recipientKey: data.recipientKey,
      queueNumber: data.queueNumber,
    };
  })
  .handler(async ({ data, context }) => {
    await assertNotificationRateLimit("queue-proximity", context.userId, 30);
    data.recipientKey = await (
      await import("@/lib/device-key.server")
    ).deviceIdentity(data.recipientKey);
    if (!data.recipientKey || !data.queueNumber) return { notified: false, ahead: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("clinic_id", data.clinicId)
      .eq("queue_number", data.queueNumber)
      .eq("patient_user_id", context.userId)
      .eq("status", "waiting")
      .limit(1);
    if (bookingError) {
      console.error("[svrCheckQueueProximity] booking lookup failed:", bookingError.message);
      throw new Error("BOOKING_LOOKUP_FAILED");
    }
    if (!bookings?.length) return { notified: false, ahead: null };

    const { data: clinic, error: clinicError } = await supabaseAdmin
      .from("clinics")
      .select("doctor, now_serving")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (clinicError) {
      console.error("[svrCheckQueueProximity] clinic lookup failed:", clinicError.message);
      throw new Error("CLINIC_LOOKUP_FAILED");
    }
    if (!clinic) return { notified: false, ahead: null };
    const ahead = Math.max(0, data.queueNumber - (clinic.now_serving ?? 0) - 1);
    if (ahead > 2) return { notified: false, ahead };

    const title = ahead === 0 ? "دورك دلوقتي! 🎉" : `تبقى ${ahead} مرضى على دورك ⏳`;
    const body = `عيادة ${clinic.doctor ?? ""} — رقم دورك ${data.queueNumber}`;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("audience", "patient")
      .eq("recipient_key", data.recipientKey)
      .eq("clinic_id", data.clinicId)
      .eq("kind", "queue")
      .eq("title", title)
      .eq("body", body)
      .limit(1);
    if (existingError) {
      console.error("[svrCheckQueueProximity] notification lookup failed:", existingError.message);
      throw new Error("NOTIFICATION_LOOKUP_FAILED");
    }
    if (existing && existing.length) return { notified: false, ahead };

    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const notificationKey = [
      "queue-notification",
      data.recipientKey,
      data.clinicId,
      data.queueNumber,
      ahead,
    ].join(":");
    if (!(await checkRateLimit(notificationKey, 1, 10))) {
      return { notified: false, ahead };
    }

    const { error: insertError } = await supabaseAdmin.from("notifications").insert({
      audience: "patient",
      recipient_key: data.recipientKey,
      clinic_id: data.clinicId,
      title,
      body,
      url: `/patient/queue/${data.clinicId}`,
      kind: "queue",
    });
    if (insertError) {
      console.error("[svrCheckQueueProximity] notification insert failed:", insertError.message);
      throw new Error("NOTIFICATION_INSERT_FAILED");
    }
    return { notified: true, ahead };
  });
