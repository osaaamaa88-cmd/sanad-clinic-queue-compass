import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DoctorNameSearch } from "@/components/DoctorNameSearch";

export const Route = createFileRoute("/find-doctor")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "سَنَد — ابحث عن طبيب بالاسم" },
      { name: "description", content: "ابحث عن أي طبيب على سَنَد باسمه أو تخصصه أو منطقته وافتح بروفايله فوراً." },
      { property: "og:title", content: "سَنَد — ابحث عن طبيب بالاسم" },
      { property: "og:description", content: "بحث فوري عن الأطباء بالاسم والتخصص والمنطقة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindDoctor,
});

function FindDoctor() {
  return (
    <AppShell title="ابحث عن طبيب" subtitle="بالاسم أو التخصص أو المنطقة">
      <DoctorNameSearch />
    </AppShell>
  );
}
