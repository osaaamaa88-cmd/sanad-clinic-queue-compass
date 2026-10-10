import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListOrdered, MessagesSquare, Pill, Search, Settings, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, unreadCounts } from "@/lib/chat";
import { RxComposer } from "@/components/RxComposer";
import { getSpecialty } from "@/lib/mock-data";

export function DoctorBottomNav({ clinicId }: { clinicId?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [unread, setUnread] = useState(0);
  const [rxOpen, setRxOpen] = useState(false);
  const [info, setInfo] = useState({ doctor: "", specialty: "", clinicAddress: "", clinicPhone: "" });

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

  useEffect(() => {
    if (!clinicId) return;
    void supabase.from("clinics").select("*").eq("id", clinicId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const d = data as Record<string, unknown>;
      setInfo({ doctor: String(d.doctor ?? ""), specialty: getSpecialty(String(d.specialty_id ?? ""))?.name ?? "", clinicAddress: [d.address, d.area].filter(Boolean).map(String).join(" — "), clinicPhone: String(d.phone ?? "") });
    });
  }, [clinicId]);

  const items = [
    { key: "profile", label: "عيادتي", icon: Stethoscope, active: pathname === "/doctor" || pathname === "/doctor/" || pathname.startsWith("/patient/clinic/"), node: clinicId ? { to: "/patient/clinic/$id" as const, params: { id: clinicId } } : { to: "/doctor" as const } },
    { key: "msgs", label: "الرسائل", icon: MessagesSquare, active: pathname.startsWith("/messages"), node: { to: "/messages" as const }, badge: unread },
    { key: "rx" },
    { key: "queue", label: "الطابور", icon: ListOrdered, active: pathname.startsWith("/reception"), node: { to: "/reception" as const } },
    { key: "settings", label: "الإعدادات", icon: Settings, active: pathname.startsWith("/doctor-settings"), node: { to: "/doctor-settings" as const } },
  ];

  return (
    <>
      {!pathname.startsWith("/find-doctor") && (
        <Link to="/find-doctor" aria-label="ابحث عن زميل" data-bottom-nav className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] grid h-10 w-10 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow backdrop-blur">
          <Search className="h-5 w-5" />
        </Link>
      )}
      <nav aria-label="تنقل الطبيب" data-bottom-nav className="fixed inset-x-0 bottom-0 z-[80] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto mb-2 grid h-16 max-w-md grid-cols-5 rounded-2xl border border-primary/30 bg-card/95 px-1 shadow-[0_-8px_24px_hsl(var(--primary)/0.15)] backdrop-blur-xl sm:max-w-xl" style={{ marginInline: "auto", width: "calc(100% - 1rem)" }}>
          {items.map((it) => {
            if (it.key === "rx") {
              return (
                <button key="rx" type="button" onClick={() => setRxOpen(true)} aria-label="روشتة جديدة" className="relative flex flex-col items-center justify-end pb-1 text-[11px] font-bold text-primary">
                  <span className="absolute -top-6 grid h-14 w-14 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_6px_20px_hsl(var(--primary)/0.5)]">
                    <Pill className="h-6 w-6" />
                  </span>
                  روشتة
                </button>
              );
            }
            const Icon = it.icon!;
            if ((it as { soon?: boolean }).soon) {
              return (
                <button key={it.key} type="button" onClick={() => alert("إدارة الطابور والحجوزات قريباً ⏳")} className="relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-muted-foreground opacity-70">
                  <span className="relative grid h-8 w-11 place-items-center rounded-xl">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -top-1.5 -left-2 rounded-full bg-secondary px-1 text-[8px] font-extrabold text-foreground">قريباً</span>
                  </span>
                  {it.label}
                </button>
              );
            }
            return (
              <Link
                key={it.key}
                {...(it.node as { to: "/doctor" })}
                aria-current={it.active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${it.active ? "text-primary" : "text-muted-foreground"}`}
              >
                <span className={`relative grid h-8 w-11 place-items-center rounded-xl ${it.active ? "bg-primary text-primary-foreground" : ""}`}>
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
      {rxOpen && <RxComposer defaults={{ patient: "", ...info }} onClose={() => setRxOpen(false)} />}
    </>
  );
}
