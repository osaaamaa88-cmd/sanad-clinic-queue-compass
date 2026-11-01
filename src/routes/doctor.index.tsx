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
      desc: "اكتب واطبع روشتة",
      icon: Pill,
      onClick: () => setRxOpen(true),
    },
    {
      label: "الاستقبال والطابور",
      desc: "الحجوزات والدور",
      icon: ListOrdered,
      to: "/reception" as const,
    },
    {
      label: "رسائل المرضى",
      desc: "رد على الاستفسارات",
      icon: MessagesSquare,
      to: "/messages" as const,
    },
    {
      label: "الستوري والتنبيهات",
      desc: "انشر لمرضاك",
      icon: Megaphone,
      to: "/doctor/stories" as const,
    },
    {
      label: "إعدادات العيادة",
      desc: "المواعيد والأسعار",
      icon: Settings,
      to: "/doctor-settings" as const,
    },
    {
      label: "التغذية والسعرات",
      desc: "أنظمة للمرضى ولك",
      icon: Utensils,
      to: "/nutrition" as const,
    },
  ];

  return (
    <AppShell title="لوحة الطبيب" backTo="/">
      <div className="space-y-4 pb-28">
        <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-soft">
          <p className="text-xs opacity-80">أهلاً دكتور</p>
          <h2 className="mt-1 text-xl font-extrabold">{String(c.doctor ?? c.name ?? "")}</h2>
          <p className="text-sm opacity-90">{String(c.name ?? "")}</p>
        </div>
        <ModeSwitch current="doctor" />
        <div className="grid grid-cols-2 gap-3">
          {tools.map((t) => {
            const inner = (
              <>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="mt-2 block text-sm font-extrabold text-foreground">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.desc}</span>
              </>
            );
            const cls =
              "rounded-2xl border border-border bg-card p-4 text-right shadow-soft transition active:scale-95";
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
            className="rounded-2xl border border-border bg-card p-4 text-right shadow-soft transition active:scale-95"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Eye className="h-5 w-5" />
            </span>
            <span className="mt-2 block text-sm font-extrabold text-foreground">صفحة عيادتي</span>
            <span className="block text-xs text-muted-foreground">زي ما المريض بيشوفها</span>
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
            patient: "",
            doctor: String(c.doctor ?? ""),
            specialty: "",
            clinicAddress: String(c.address ?? ""),
            clinicPhone: String(c.phone ?? ""),
          }}
          onClose={() => setRxOpen(false)}
        />
      )}
    </AppShell>
  );
}
