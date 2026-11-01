import {
  svrListPatientNotifications,
  svrListClinicNotifications,
  svrMarkPatientNotificationsRead,
  svrMarkClinicNotificationsRead,
  svrCheckQueueProximity,
} from "@/lib/notifications.functions";
import { getFollowerKey } from "@/lib/clinic-profile";
import { isNative, notifyLocal } from "@/lib/native";

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
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display === "granted") return true;
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch (error) {
      console.error("[ensureNotificationPermission] Native permission request failed:", error);
      return false;
    }
  }
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch (error) {
    console.error("[ensureNotificationPermission] Browser permission request failed:", error);
    return false;
  }
}

/** Deliver through Capacitor on native devices and the browser on web. */
export async function pushLocalNotification(title: string, body: string) {
  return notifyLocal(title, body);
}
