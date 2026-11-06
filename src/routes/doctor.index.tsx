import { ModeSwitch } from "@/components/ModeSwitch";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Eye,
  ListOrdered,
  Loader2,
  Megaphone,
  MessagesSquare,
  Pill,
  Settings,
  Utensils,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { DoctorBottomNav } from "@/components/DoctorBottomNav";
import { RxComposer } from "@/components/RxComposer";
import { DoctorLiveQueue } from "@/components/doctor/DoctorLiveQueue";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { getMyClinicMembership } from "@/lib/mock-data";

export const Route = createFileRoute("/doctor/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "لوحة الطبيب — سند" },
      { name: "description", content: "لوحة الطبيب على سند: بروفايل العيادة وحجوزاتها." },
      { property: "og:title", content: "لوحة الطبيب — سند" },
      { property: "og:description", content: "ادخل لبروفايل عيادتك وإدارة مواعيدك على سند." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorHome,
});

type Clinic = Awaited<ReturnType<typeof getMyClinicMembership>>["clinic"];

function DoctorHome() {
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<Clinic>();
  const [loading, setLoading] = useState(true);
  const [rxOpen, setRxOpen] = useState(false);
  const [rxPatient, setRxPatient] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) return navigate({ to: "/doctor/login", replace: true });
      const m = await getMyClinicMembership();
      if (cancelled) return;
      if (m.role === "secretary") return navigate({ to: "/reception", replace: true });
      if (!m.clinic) return navigate({ to: "/doctor-settings", replace: true });
      setClinic(m.clinic);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading || !clinic) {
    return (
      <AppShell title="لوحة الطبيب" backTo="/">
        <div className="mt-4">
          <ModeSwitch current="doctor" />
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
        </div>
      </AppShell>
    );
  }

  const c = clinic as unknown as Record<string, unknown>;
  const tools = [
    {
      label: "الروشتة الذكية",
      desc: "",
      icon: Pill,
      onClick: () => setRxOpen(true),
    },
    {
      label: "الاستقبال والدور",
      desc: "",
      icon: ListOrdered,
      to: "/reception" as const,
    },
    {
      label: "الرسائل",
      desc: "",
      icon: MessagesSquare,
      to: "/messages" as const,
    },
    {
      label: "الستوري",
      desc: "",
      icon: Megaphone,
      to: "/doctor/stories" as const,
    },
    {
      label: "الإعدادات",
      desc: "",
      icon: Settings,
      to: "/doctor-settings" as const,
    },
    {
      label: "التغذية",
      desc: "",
      icon: Utensils,
      to: "/nutrition" as const,
    },
  ];

  return (
    <AppShell title="لوحة الطبيب" backTo="/">
      <div className="space-y-4 pb-28">
        {/* 🌟 Executive Clinic Cockpit */}
        <div className="relative overflow-hidden rounded-[2rem] gradient-primary p-6 text-primary-foreground shadow-soft ring-1 ring-primary-foreground/10">
          <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-xs">
                لوحة إدارة العيادة 🩺
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {String(c.doctor ?? c.name ?? "")}
              </h2>
              <p className="mt-0.5 text-xs font-semibold opacity-85">
                {String(c.name ?? "العيادة الرئيسية")}
              </p>
            </div>

            <Link
              to="/patient/clinic/$id"
              params={{ id: clinic.id }}
              className="flex min-h-11 items-center gap-1.5 rounded-2xl bg-white/20 px-3.5 text-xs font-black text-white shadow-xs backdrop-blur-md transition hover:bg-white/30 active:scale-95"
            >
              <Eye className="h-4 w-4" />
              <span>عرض البروفايل</span>
            </Link>
          </div>

          {/* Quick Status Line — مربوطة بالحالة الفعلية للعيادة */}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/15 pt-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  clinic.availableNow
                    ? "animate-pulse bg-white"
                    : "bg-white/40"
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-bold opacity-95">
                {clinic.availableNow ? "العيادة مفتوحة دلوقتي" : "العيادة مقفولة حالياً"}
              </span>
            </div>
            <div className="text-left text-xs font-bold opacity-80">
              الدور الحالي: {Number(c.now_serving ?? 0) > 0 ? `#${c.now_serving}` : "لم يبدأ"}
            </div>
          </div>
        </div>
        <ModeSwitch current="doctor" />
        <DoctorLiveQueue clinicId={clinic.id} onPrescribe={(n) => { setRxPatient(n); setRxOpen(true); }} />
        <div className="grid grid-cols-2 gap-3">
          {tools.map((t) => {
            const inner = (
              <>
                <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="mt-2 block text-sm font-extrabold text-foreground">{t.label}</span>
                              </>
            );
            const cls =
              "tile-3d group flex min-h-28 flex-col justify-between rounded-3xl border border-border/60 p-4 text-right";
            return t.to ? (
              <Link key={t.label} to={t.to} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={t.label} type="button" onClick={t.onClick} className={cls}>
                {inner}
              </button>
            );
          })}
          <Link
            to="/patient/clinic/$id"
            params={{ id: clinic.id }}
            className="tile-3d group flex min-h-28 flex-col justify-between rounded-3xl border border-border/60 p-4 text-right"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground shadow-soft">
              <Eye className="h-5 w-5" />
            </span>
            <span className="mt-2 block text-sm font-extrabold text-foreground">صفحة عيادتي</span>
                      </Link>
        </div>
      </div>
      {/* Floating Quick Bar (Executive) */}
      <div className="fixed bottom-20 right-4 z-[70] flex flex-col gap-2 print:hidden">
        <Link
          to="/patient/health"
          aria-label="الملف الطبي والمجسم"
          className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-lg transition active:scale-95 hover:bg-secondary"
        >
          <HeartPulse className="h-5 w-5 text-primary" />
        </Link>
        <Link
          to="/reception"
          aria-label="دفتر الحجز"
          className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-card text-foreground shadow-lg transition active:scale-95 hover:bg-secondary"
        >
          <BookOpen className="h-5 w-5 text-primary" />
        </Link>
      </div>
      <DoctorBottomNav clinicId={clinic.id} />
      {rxOpen && (
        <RxComposer
          defaults={{
            patient: rxPatient,
            doctor: String(c.doctor ?? ""),
            specialty: "",
            clinicAddress: String(c.address ?? ""),
            clinicPhone: String(c.phone ?? ""),
          }}
          onClose={() => { setRxOpen(false); setRxPatient(""); }}
        />
      )}
    </AppShell>
  );
}
