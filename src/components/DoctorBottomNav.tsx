import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListOrdered, MessagesSquare, Settings, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unreadCounts } from "@/lib/chat";

export function DoctorBottomNav({ clinicId }: { clinicId?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const uid = await currentUserId();
      if (!uid || !alive) return;
      const counts = await unreadCounts(uid);
      if (alive) setUnread(Object.values(counts).reduce((a, b) => a + b, 0));
    };
    void refresh();
    const ch = supabase
      .channel("doctor-nav-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_messages" }, () => void refresh())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  const items = [
    { key: "profile", label: "عيادتي", icon: Stethoscope, active: pathname.startsWith("/patient/clinic/") || pathname.startsWith("/doctor"), node: clinicId ? { to: "/patient/clinic/$id" as const, params: { id: clinicId } } : { to: "/doctor" as const } },
    { key: "msgs", label: "الرسائل", icon: MessagesSquare, active: pathname.startsWith("/messages"), node: { to: "/messages" as const }, badge: unread },
    { key: "queue", label: "الطابور", icon: ListOrdered, active: pathname.startsWith("/reception"), node: { to: "/reception" as const } },
    { key: "settings", label: "الإعدادات", icon: Settings, active: pathname.startsWith("/doctor-settings"), node: { to: "/doctor-settings" as const } },
  ];

  return (
    <nav aria-label="تنقل الطبيب" className="fixed inset-x-0 bottom-0 z-[80] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto mb-2 grid h-16 max-w-md grid-cols-4 rounded-2xl border border-primary/30 bg-card/95 px-2 shadow-[0_-8px_24px_hsl(var(--primary)/0.15)] backdrop-blur-xl sm:max-w-xl" style={{ marginInline: "auto", width: "calc(100% - 1rem)" }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.key}
              {...(it.node as { to: "/doctor" })}
              aria-current={it.active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${it.active ? "text-primary" : "text-muted-foreground"}`}
            >
              <span className={`relative grid h-8 w-12 place-items-center rounded-xl ${it.active ? "bg-primary text-primary-foreground" : ""}`}>
                <Icon className="h-5 w-5" />
                {!!it.badge && (
                  <span className="absolute -top-1 -left-1 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground">
                    {it.badge > 99 ? "99+" : it.badge}
                  </span>
                )}
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
