import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Mic, UserRound } from "lucide-react";
import { isSeniorModeOn, isVoiceModeOn, setSeniorMode, setVoiceMode } from "@/lib/voice";
import { ModeSwitch } from "@/components/ModeSwitch";
import { SoundToggle, ThemeSetting } from "@/components/SoundControls";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "الإعدادات | سند" },
      {
        name: "description",
        content: "إعدادات سند وتفعيل نمط المساعد الصوتي لكبار السن وفاقدي البصر.",
      },
      { property: "og:title", content: "الإعدادات | سند" },
      { property: "og:description", content: "فعّل المساعد الصوتي في سند." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

export function SettingsPage() {
  const [on, setOn] = useState(false);
  const [senior, setSenior] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isVoiceModeOn());
    const syncSenior = () => setSenior(isSeniorModeOn());
    sync();
    syncSenior();
    window.addEventListener("sanad:voice-mode", sync);
    window.addEventListener("sanad:senior-mode", syncSenior);
    return () => {
      window.removeEventListener("sanad:voice-mode", sync);
      window.removeEventListener("sanad:senior-mode", syncSenior);
    };
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setVoiceMode(next);
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background p-4">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="رجوع" className="rounded-full border p-2">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-extrabold">الإعدادات</h1>
      </header>
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold">إمكانية الوصول</h2>
        <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-bold">نمط المساعد الصوتي (لكبار السن وفاقدي البصر)</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={on}
            onChange={toggle}
            className="h-6 w-11 accent-primary"
          />
        </label>
        <label className="flex min-h-20 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
          <span className="flex items-center gap-3">
            <UserRound className="h-6 w-6 shrink-0 text-primary" />
            <span className="font-bold">
              وضع كبار السن داخل نيمو — ردود صوتية تلقائية وأزرار أكبر
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={senior}
            onChange={() => setSeniorMode(!senior)}
            className="h-6 w-11 accent-primary"
          />
        </label>
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-extrabold">الصوت والمظهر</h2>
        <SoundToggle />
        <ThemeSetting />
      </section>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-extrabold">وضع الاستخدام</h2>
        <ModeSwitch current="patient" />
      </section>
      <Link
        to="/developer"
        className="mt-6 flex min-h-20 items-center gap-3 rounded-2xl border border-border bg-card p-4 transition active:scale-[0.99]"
      >
        <UserRound className="h-6 w-6 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-extrabold">عن المطوّر</span>
          <span className="block text-xs text-muted-foreground">أسامة سند — مؤسس سند</span>
        </span>
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </Link>
    </main>
  );
}
