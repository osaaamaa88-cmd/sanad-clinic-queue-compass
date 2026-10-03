import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId, listConversations, unreadCounts, type Conversation } from "@/lib/chat";

export const Route = createFileRoute("/messages/")({
  head: () => ({
    meta: [
      { title: "الرسائل — سَنَد" },
      { name: "description", content: "محادثاتك مع العيادات والمرضى على سَنَد." },
      { property: "og:title", content: "الرسائل — سَنَد" },
      { property: "og:description", content: "راسل عيادتك مباشرة داخل سَنَد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inbox,
});

type ClinicLite = { id: string; doctor: string; avatar_url: string };

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function Inbox() {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [clinics, setClinics] = useState<Record<string, ClinicLite>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const id = await currentUserId();
      if (!alive) return;
      setUid(id);
      if (!id) return;
      const list = await listConversations();
      const ids = [...new Set(list.map((c) => c.clinic_id))];
      const { data } = ids.length
        ? await supabase.from("clinics").select("id, doctor, avatar_url").in("id", ids)
        : { data: [] as ClinicLite[] };
      const u = await unreadCounts(id);
      if (!alive) return;
      setConvs(list);
      setClinics(Object.fromEntries((data ?? []).map((c) => [c.id, c])));
      setUnread(u);
    };
    void load();
    const ch = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "clinic_messages" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  return (
    <AppShell title="الرسائل" backTo="/patient" centeredTitle>
      {uid === undefined ? (
        <div className="mt-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !uid ? (
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center">
          <MessagesSquare className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 font-bold">سجّل دخولك عشان تشوف رسايلك</p>
          <Link to="/patient/login" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground">تسجيل الدخول</Link>
        </div>
      ) : convs.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          <MessagesSquare className="mx-auto mb-3 h-10 w-10 opacity-50" />
          لسه مفيش محادثات. افتح بروفايل أي عيادة واضغط «مراسلة».
        </div>
      ) : (
        <ul className="-mx-4 divide-y divide-border">
          {convs.map((c) => {
            const amPatient = c.patient_id === uid;
            const clinic = clinics[c.clinic_id];
            const name = amPatient ? clinic?.doctor ?? "العيادة" : c.patient_name || "مريض";
            const avatar = amPatient ? clinic?.avatar_url : "";
            const n = unread[c.id] ?? 0;
            return (
              <li key={c.id}>
                <Link to="/messages/$id" params={{ id: c.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary">{name.slice(0, 1)}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-extrabold">{name}</p>
                      <span className={`shrink-0 text-[11px] ${n ? "font-bold text-success" : "text-muted-foreground"}`}>{formatChatTime(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm text-muted-foreground">{c.last_message || "ابدأ المحادثة"}</p>
                      {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-success px-1.5 text-[11px] font-extrabold text-success-foreground">{n}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
