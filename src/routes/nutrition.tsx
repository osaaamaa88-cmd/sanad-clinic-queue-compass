import { useDoctorClinicId } from "@/lib/use-doctor-mode";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AnalyzeSection } from "@/components/nutrition/AnalyzeSection";
import { AlternativesSection } from "@/components/nutrition/AlternativesSection";
import { CalorieRing } from "@/components/nutrition/CalorieRing";
import { PlansSection } from "@/components/nutrition/PlansSection";
import { ProfileForm } from "@/components/nutrition/ProfileForm";
import { TodayMeals } from "@/components/nutrition/TodayMeals";
import { WeekChart } from "@/components/nutrition/WeekChart";
import { useNutrition } from "@/hooks/use-nutrition";

export const Route = createFileRoute("/nutrition")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "التغذية والسعرات — سند" },
      {
        name: "description",
        content: "صوّر أكلك واعرف سعراته، احسب احتياجك اليومي وتابع وجباتك على سند.",
      },
      { property: "og:title", content: "التغذية والسعرات — سند" },
      {
        property: "og:description",
        content: "تحليل الأكل بالكاميرا، عداد سعرات يومي، وأنظمة غذائية جاهزة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Nutrition,
});

function Nutrition() {
  const toolsBack = useDoctorClinicId() ? "/doctor" : "/patient/login";
  const n = useNutrition();

  return (
    <AppShell title="التغذية والسعرات" subtitle="صوّر أكلك واعرف سعراته" backTo={toolsBack}>
      <div className="space-y-4 pb-28">
        <CalorieRing eaten={n.eaten} target={n.target} macros={n.macros} />
        <AnalyzeSection
          meal={n.meal}
          onMealChange={n.setMeal}
          text={n.text}
          onTextChange={n.setText}
          busy={n.busy}
          preview={n.preview}
          result={n.result}
          onAnalyzeImage={(f) => void n.analyzeImage(f)}
          onAnalyzeText={n.analyzeText}
          onAddResult={n.addResult}
        />
        <AlternativesSection
          altQ={n.altQ}
          onAltQChange={n.setAltQ}
          altBusy={n.altBusy}
          alts={n.alts}
          remaining={Math.max(0, n.target - n.eaten)}
          meal={n.meal}
          onAsk={(q) => void n.askAlts(q)}
          onAddAlt={n.addAlt}
        />
        <TodayMeals todays={n.todays} onDelete={n.removeEntry} />
        <WeekChart log={n.log} target={n.target} />
        <ProfileForm profile={n.profile} target={n.target} onChange={n.updProfile} />
        <PlansSection />

        <p className="rounded-xl bg-secondary/50 p-3 text-center text-xs text-muted-foreground">
          السعرات تقديرية بالذكاء الاصطناعي ولا تغني عن استشارة أخصائي التغذية.
        </p>
      </div>
    </AppShell>
  );
}
