import {
  svrListPatientNotifications,
  svrListClinicNotifications,
  svrMarkPatientNotificationsRead,
  svrMarkClinicNotificationsRead,
  svrCheckQueueProximity,
} from "@/lib/notifications.functions";
import { getFollowerKey } from "@/lib/clinic-profile";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  url: string;
  kind: string;
  isRead: boolean;
  createdAt: string;
};

export async function listPatientNotifications() {
  return await svrListPatientNotifications({ data: { recipientKey: getFollowerKey() } });
}

export async function listClinicNotifications(clinicId: string) {
  return await svrListClinicNotifications({ data: { clinicId } });
}

export async function markPatientNotificationsRead() {
  await svrMarkPatientNotificationsRead({ data: { recipientKey: getFollowerKey() } });
}

export async function markClinicNotificationsRead(clinicId: string) {
  await svrMarkClinicNotificationsRead({ data: { clinicId } });
}

export async function checkQueueProximity(clinicId: string, queueNumber: number) {
  try {
    return await svrCheckQueueProximity({
      data: { clinicId, recipientKey: getFollowerKey(), queueNumber },
    });
  } catch (error) {
    console.error("[checkQueueProximity] Queue proximity check failed:", error);
    return { notified: false, ahead: null as number | null };
  }
}

/** Ask once for browser notification permission (best-effort, silent on failure). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Show a native notification if allowed. */
export function pushLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* ignore */
  }
}
