import { useCallback, useEffect, useRef, useState } from "react";
import { playNotification } from "@/lib/sounds";
import {
  Bell,
  X,
  CalendarPlus,
  MessageCircle,
  Image as ImageIcon,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  listPatientNotifications,
  listClinicNotifications,
  markPatientNotificationsRead,
  markClinicNotificationsRead,
  ensureNotificationPermission,
  pushLocalNotification,
  type AppNotification,
} from "@/lib/notifications";

function iconFor(kind: string) {
  if (kind === "booking") return CalendarPlus;
  if (kind === "reply") return MessageCircle;
  if (kind === "story") return ImageIcon;
  if (kind === "urgent") return AlertTriangle;
  if (kind === "queue") return Users;
  return Bell;
}

/** Live notification bell for patients (device key) or clinic staff (clinicId). */
export function NotificationsBell({
  audience,
  clinicId,
  tone = "primary",
}: {
  audience: "patient" | "clinic";
  clinicId?: string;
  tone?: "primary" | "gold";
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  const pull = useCallback(async () => {
    const res =
      audience === "clinic"
        ? clinicId
          ? await listClinicNotifications(clinicId)
          : { items: [], unread: 0 }
        : await listPatientNotifications();
    setItems(res.items);
    setUnread(res.unread);
    // Native pop-up for anything brand new after the first load.
    for (const n of res.items) {
      if (!seen.current.has(n.id)) {
        if (!first.current && !n.isRead) {
          pushLocalNotification(n.title, n.body);
          playNotification();
        }
        seen.current.add(n.id);
      }
    }
    first.current = false;
  }, [audience, clinicId]);

  useEffect(() => {
    ensureNotificationPermission();
    pull();
    const t = window.setInterval(pull, 20000);
    return () => window.clearInterval(t);
  }, [pull]);

  const openPanel = async () => {
    setOpen(true);
    if (unread) {
      if (audience === "clinic" && clinicId) await markClinicNotificationsRead(clinicId);
      else if (audience === "patient") await markPatientNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const accent = tone === "gold" ? "text-gold border-gold/40" : "text-primary border-border";

  return (
    <>
      <button
        onClick={openPanel}
        aria-label="الإشعارات"
        className={`relative grid h-9 w-9 place-items-center rounded-full border bg-card/70 backdrop-blur ${accent}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 left-0 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-xs font-extrabold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-end bg-black/60 sm:items-center sm:justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-4 sm:max-w-md sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-extrabold">الإشعارات</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="grid h-8 w-8 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                مفيش إشعارات جديدة.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((n) => {
                  const Icon = iconFor(n.kind);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          setOpen(false);
                          if (n.url) navigate({ to: n.url } as never);
                        }}
                        className="flex w-full items-start gap-3 rounded-2xl border border-border bg-background p-3 text-right"
                      >
                        <span
                          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                            n.kind === "urgent"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary-soft text-primary"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">{n.title}</span>
                          {n.body && (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {n.body}
                            </span>
                          )}
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
