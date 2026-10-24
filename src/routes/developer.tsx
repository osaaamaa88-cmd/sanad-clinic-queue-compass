import { APP_VERSION_LABEL } from "@/lib/app-version";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Instagram, GraduationCap, Briefcase } from "lucide-react";
import portrait from "@/assets/osama-portrait.jpg.asset.json";

export const Route = createFileRoute("/developer")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "عن المطور — أسامة سند | سَنَد SANAD" },
      {
        name: "description",
        content:
          "تعرّف على مؤسس سَنَد: أسامة محمد عبد المجيد سند، Founder & CEO وطالب طب أسنان مهتم بالتقنية الصحية.",
      },
      { property: "og:title", content: "عن المطور — أسامة سند | سَنَد SANAD" },
      {
        property: "og:description",
        content:
          "أسامة محمد عبد المجيد سند — Founder & CEO, SANAD. Dental Student & HealthTech Enthusiast.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeveloperPage,
});

function DeveloperPage() {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-background text-foreground">
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-lg sm:p-8">
          <img
            src={portrait.url}
            alt="أسامة محمد عبد المجيد سند"
            className="mx-auto aspect-square w-36 rounded-2xl border-4 border-primary/20 object-cover object-top shadow-xl sm:w-44"
          />
          <h1 className="mt-5 text-xl font-bold sm:text-2xl">أسامة محمد عبد المجيد سند</h1>
          <p dir="ltr" className="mt-1 text-sm text-muted-foreground">
            Osama M. Sanad
          </p>

          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary">
              <Briefcase className="h-4 w-4" />
              <span dir="ltr" className="font-semibold">
                Founder & CEO, SANAD
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-3 py-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span dir="ltr">Dental Student & HealthTech Enthusiast</span>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            مؤسس سَنَد، طالب طب أسنان شغوف بالبرمجة والتقنية، يبني أدوات رقمية بسيطة تسهّل الوصول
            للرعاية الصحية في مصر.
          </p>

          <a
            href="https://www.instagram.com/dr__osama0"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <Instagram className="h-4 w-4" />
            <span dir="ltr">@dr__osama0</span>
          </a>
        </div>

        <Link
          to="/"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-md hover:opacity-90"
        >
          <ArrowLeft className="h-5 w-5" />
          العودة إلى رئيسية سَنَد
        </Link>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <span dir="ltr">سند | SANAD - Built with care in Egypt © 2026 · {APP_VERSION_LABEL}</span>
      </footer>
    </div>
  );
}
