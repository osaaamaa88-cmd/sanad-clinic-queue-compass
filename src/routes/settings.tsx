import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Mic } from "lucide-react";
import { isVoiceModeOn, setVoiceMode, speak } from "@/lib/voice";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
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

export function SettingsPage() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isVoiceModeOn());
    sync();
    window.addEventListener("sanad:voice-mode", sync);
    return () => window.removeEventListener("sanad:voice-mode", sync);
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setVoiceMode(next);
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background p-4">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="رجوع" className="rounded-full border p-2"><ArrowRight className="h-5 w-5" /></Link>
        <h1 className="text-xl font-extrabold">الإعدادات</h1>
      </header>
      <div className="flex items-stretch gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-2xl border bg-card p-4">
          <span className="flex items-center gap-3">
            <Mic className="h-6 w-6 text-primary" />
            <span className="font-bold">نمط المساعد الصوتي (لكبار السن وفاقدي البصر)</span>
          </span>
          <input type="checkbox" role="switch" checked={on} onChange={toggle} className="h-6 w-11 accent-primary" />
        </label>
        <Button
          variant="outline"
          className="h-auto rounded-2xl px-3 font-bold"
          onClick={() => speak("أهلاً بك في سَنَد، أنا هنا لمساعدتك. ده اختبار الصوت النسائي.")}
        >
          اختبار الصوت النسائي 🔊
        </Button>
      </div>
      <div className="mt-3">
        <MedicalDisclaimer compact />
      </div>
      <Button onClick={() => setVoiceMode(!on)} className="mt-4 w-full font-bold">
        <Mic /> {on ? "إيقاف المساعد الصوتي" : "تفعيل المساعد الصوتي هنا"}
      </Button>
    </main>
  );
}
