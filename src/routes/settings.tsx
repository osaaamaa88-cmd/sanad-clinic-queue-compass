import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mic } from "lucide-react";
import { isVoiceModeOn, setVoiceMode, speak } from "@/lib/voice";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات | سَنَد" },
      { name: "description", content: "إعدادات سَنَد وتفعيل نمط المساعد الصوتي لكبار السن وفاقدي البصر." },
      { property: "og:title", content: "الإعدادات | سَنَد" },
      { property: "og:description", content: "فعّل المساعد الصوتي في سَنَد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(isVoiceModeOn()), []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setVoiceMode(next);
    if (next) speak("تم تفعيل المساعد الصوتي. ستجد زر الميكروفون العائم دائماً في أسفل الشاشة لمساعدتك بالصوت في أي وقت.");
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background p-4">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="رجوع" className="rounded-full border p-2"><ArrowRight className="h-5 w-5" /></Link>
        <h1 className="text-xl font-extrabold">الإعدادات</h1>
      </header>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-card p-4">
        <span className="flex items-center gap-3">
          <Mic className="h-6 w-6 text-primary" />
          <span className="font-bold">نمط المساعد الصوتي (لكبار السن وفاقدي البصر)</span>
        </span>
        <input type="checkbox" role="switch" checked={on} onChange={toggle} className="h-6 w-11 accent-primary" />
      </label>
      <Link to="/accessibility-assistant" className="mt-4 block rounded-2xl bg-primary p-4 text-center font-bold text-primary-foreground">
        افتح المساعد الصوتي الآن
      </Link>
    </main>
  );
}
