import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { getMyClinicMembership } from "@/lib/mock-data";

export const Route = createFileRoute("/doctor/")({
  head: () => ({
    meta: [
      { title: "لوحة الطبيب — سندي" },
      { name: "description", content: "لوحة الطبيب على سندي: بروفايل العيادة وحجوزاتها." },
      { property: "og:title", content: "لوحة الطبيب — سندي" },
      { property: "og:description", content: "ادخل لبروفايل عيادتك وإدارة مواعيدك على سندي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DoctorHome,
});

function DoctorHome() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate({ to: "/doctor/login", replace: true });
        return;
      }
      const membership = await getMyClinicMembership();
      if (cancelled) return;
      if (membership.role === "secretary") {
        navigate({ to: "/reception", replace: true });
        return;
      }
      if (membership.clinic) {
        navigate({ to: "/patient/clinic/$id", params: { id: membership.clinic.id }, replace: true });
        return;
      }
      navigate({ to: "/doctor-settings", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AppShell title="لوحة الطبيب" backTo="/">
      <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
      </div>
    </AppShell>
  );
}
