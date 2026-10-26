import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Clock, Bell, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  checkQueueProximity,
  ensureNotificationPermission,
  pushLocalNotification,
} from "@/lib/notifications";
import { getVerifiedClinic, type Clinic } from "@/lib/mock-data";

export const Route = createFileRoute("/patient/queue/$id")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "سند — دورك في العيادة" }] }),
  component: Queue,
});

function Queue() {
  const { id } = useParams({ from: "/patient/queue/$id" });
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getVerifiedClinic(id).then((c) => {
      if (cancelled) return;
      setClinic(c);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (clinic) setCurrent(clinic.nowServing);
  }, [clinic]);
  const yourNumber = clinic?.yourNumber ?? 0;
  const ahead = Math.max(0, yourNumber - current - 1);

  useEffect(() => {
    ensureNotificationPermission();
  }, []);

  // Live turn watcher: refresh the served number and warn when the turn is close.
  useEffect(() => {
    if (!yourNumber) return;
    let cancelled = false;
    let lastAlert = "";
    const tick = async () => {
      const c = await getVerifiedClinic(id);
      if (cancelled) return;
      if (c) setCurrent(c.nowServing);
      const res = await checkQueueProximity(id, yourNumber);
      if (cancelled || res.ahead === null) return;
      const key = `ahead-${res.ahead}`;
      if (res.ahead <= 2 && key !== lastAlert) {
        lastAlert = key;
        pushLocalNotification(
          res.ahead === 0 ? "دورك دلوقتي! 🎉" : `تبقى ${res.ahead} مرضى على دورك ⏳`,
          c ? `عيادة ${c.doctor}` : "",
        );
      }
    };
    tick();
    const t = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [id, yourNumber]);

  if (!loaded)
    return (
      <AppShell title="جاري التحميل…" backTo="/patient">
        <div />
      </AppShell>
    );
  if (!clinic) {
    return (
      <AppShell title="غير متاح" backTo="/patient">
        <div className="mt-4 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          العيادة غير موجودة.
        </div>
      </AppShell>
    );
  }

  const arrived = current >= yourNumber;

  return (
    <AppShell
      title="دورك كام؟"
      subtitle={clinic.doctor}
      backTo="/patient"
      tone="primary"
      right={<NotificationsBell audience="patient" />}
    >
      <div className="-mt-6 rounded-3xl bg-card p-6 text-center shadow-soft">
        <p className="text-sm text-muted-foreground">دورك</p>
        <div className="mt-1 text-6xl font-black text-primary">{yourNumber}</div>
        <p className="mt-3 text-sm text-muted-foreground">النمرة اللي جوه دلوقتي</p>
        <div className="mt-1 text-4xl font-extrabold">{current}</div>

        <div
          className={`mt-5 rounded-2xl p-4 text-center ${
            arrived ? "bg-success text-success-foreground" : "bg-primary-soft text-primary"
          }`}
        >
          <p className="text-lg font-extrabold">
            {arrived
              ? "🎉 دورك دلوقتي! اتفضل"
              : ahead === 0
                ? "دورك بعد المريض ده مباشرة"
                : `فاضل قدامك ${ahead} مرضى`}
          </p>
          {!arrived && (
            <p className="mt-1 text-xs opacity-80">
              <Clock className="inline h-3 w-3" /> تقدير الانتظار: ~{ahead * 10} دقيقة
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat icon={Users} label="مرضى قدامك" value={String(ahead)} />
          <Stat icon={Clock} label="متوسط الكشف" value="١٠ د" />
          <Stat icon={Bell} label="تنبيه قبل" value="٣ نمر" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{clinic.doctor}</p>
            <p className="text-xs text-muted-foreground">
              {clinic.address} — {clinic.area}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-warning/15 p-4 text-sm text-foreground">
        💡 <span className="font-bold">نصيحة:</span> ابدأ تتحرك من البيت لما يفضل قدامك ٣ مرضى.
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
      <div className="mt-1 text-sm font-extrabold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
