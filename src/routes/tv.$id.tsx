import { createFileRoute, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  getClinicById,
  getSpecialty,
  subscribeClinic,
  clinicStatusLabels,
  type Clinic,
} from "@/lib/mock-data";

export const Route = createFileRoute("/tv/$id")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "شاشة صالة الانتظار — سند" },
      {
        name: "description",
        content: "شاشة عرض رقم الدور الحالي لمرضى العيادة على تلفزيون صالة الانتظار.",
      },
      { property: "og:title", content: "شاشة صالة الانتظار — سند" },
      {
        property: "og:description",
        content: "عرض رقم الدور الحالي بخط كبير وواضح داخل صالة انتظار العيادة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TvScreen,
});

function TvScreen() {
  const { id } = useParams({ from: "/tv/$id" });
  const [clinic, setClinic] = useState<Clinic | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [clock, setClock] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    setRefreshing(true);
    const fresh = await getClinicById(id);
    if (fresh) setClinic(fresh);
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getClinicById(id).then((c) => {
      if (cancelled) return;
      setClinic(c);
      setLoaded(true);
    });
    const off = subscribeClinic(id, (c) => setClinic(c));
    // Safety net in case realtime drops.
    const poll = setInterval(async () => {
      const fresh = await getClinicById(id);
      if (fresh) setClinic(fresh);
    }, 15000);
    const tick = setInterval(() => {
      setClock(new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }));
    }, 1000);
    return () => {
      cancelled = true;
      off();
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [id]);

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-2xl">
        جاري التحميل…
      </div>
    );
  }
  if (!clinic) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-center text-3xl font-bold">
        العيادة غير موجودة
      </div>
    );
  }

  const spec = getSpecialty(clinic.specialtyId);
  const status = clinicStatusLabels[clinic.clinicStatus];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border px-10 py-6">
        <div className="min-w-0">
          <h1 className="truncate text-4xl font-black md:text-5xl">{clinic.doctor}</h1>
          <p className="mt-2 text-2xl text-muted-foreground md:text-3xl">
            {spec?.emoji} {spec?.name} {clinic.area ? `— ${clinic.area}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-left">
          <div className="text-4xl font-black text-primary md:text-5xl">{clock}</div>
          <div className="mt-1 flex items-center justify-end gap-3 text-xl text-muted-foreground">
            سند
            <button
              onClick={reload}
              aria-label="إعادة تحميل البيانات"
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-10 py-10 text-center">
        <p className="text-3xl font-bold text-muted-foreground md:text-4xl">رقم الدور الحالي</p>
        <div className="mt-4 text-[24vw] font-black leading-none text-primary md:text-[18vw]">
          {clinic.nowServing}
        </div>
        <p className="mt-6 text-2xl text-muted-foreground md:text-3xl">
          {clinic.waitingCount > 0
            ? `عدد المنتظرين: ${clinic.waitingCount}`
            : "برجاء متابعة الشاشة"}
        </p>
      </main>

      <footer
        className={`px-10 py-6 text-center text-3xl font-extrabold md:text-4xl ${
          clinic.clinicStatus === "paused"
            ? "bg-destructive text-destructive-foreground"
            : clinic.clinicStatus === "delayed"
              ? "bg-warning text-warning-foreground"
              : "bg-success text-success-foreground"
        }`}
      >
        {status.dot} {status.label}
        {clinic.clinicStatus === "delayed" && clinic.delayMinutes > 0
          ? ` — تأخير حوالي ${clinic.delayMinutes} دقيقة`
          : ""}
        {clinic.bookingsClosed ? " • تم إيقاف استقبال حجوزات جديدة اليوم" : ""}
      </footer>
    </div>
  );
}
