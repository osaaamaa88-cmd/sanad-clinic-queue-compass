import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  BellRing,
  FileText,
  HeartPulse,
  Mic,
  ShieldCheck,
  UserRound,
  VenetianMask,
} from "lucide-react";
import { isSeniorModeOn, isVoiceModeOn, setSeniorMode, setVoiceMode } from "@/lib/voice";
import { ModeSwitch } from "@/components/ModeSwitch";
import { SoundToggle, ThemeSetting } from "@/components/SoundControls";
import { AccountDeletion } from "@/components/AccountDeletion";
import { LinkRow, SettingsSection, SwitchRow, usePrefs } from "@/components/settings/SettingsBits";
import { APP_VERSION_LABEL } from "@/lib/app-version";

export const Route = createFileRoute("/settings")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "الإعدادات | سند" },
      {
        name: "description",
        content: "إعدادات سند: الحساب والخصوصية والتنبيهات والمساعد الصوتي والمظهر.",
      },
      { property: "og:title", content: "الإعدادات | سند" },
      { property: "og:description", content: "تحكم في حسابك وتنبيهاتك وخصوصيتك في سند." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

export function SettingsPage() {
  const [on, setOn] = useState(false);
  const [senior, setSenior] = useState(false);
  const [prefs, update] = usePrefs();
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

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-background p-4 pb-16">
      <header className="mb-6 flex items-center gap-3">
        <Link
          to="/patient/login"
          aria-label="رجوع"
          className="grid h-11 w-11 place-items-center rounded-full border border-border"
        >
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-extrabold">الإعدادات</h1>
      </header>

      <SettingsSection title="حسابي">
        <LinkRow icon={HeartPulse} to="/patient/health" title="ملفي الطبي" hint="القراءات والحساسية والأمراض" />
        <ModeSwitch current="patient" />
      </SettingsSection>

      <SettingsSection title="التنبيهات">
        <SwitchRow
          icon={Bell}
          title="تذكير مواعيد الأدوية"
          hint="إشعار وقت كل جرعة"
          checked={prefs.medReminders}
          onChange={(v) => update("medReminders", v)}
        />
        <SwitchRow
          icon={BellRing}
          title="تنبيه قرب دوري في العيادة"
          hint="صوت واهتزاز لما دورك يقرب"
          checked={prefs.queueAlerts}
          onChange={(v) => update("queueAlerts", v)}
        />
      </SettingsSection>

      <SettingsSection title="الخصوصية في المجتمع">
        <SwitchRow
          icon={VenetianMask}
          title="النشر بدون اسم تلقائيًا"
          hint="يتفعّل خيار «مجهول» في كل منشور جديد"
          checked={prefs.anonymousDefault}
          onChange={(v) => update("anonymousDefault", v)}
        />
      </SettingsSection>

      <SettingsSection title="إمكانية الوصول">
        <SwitchRow
          icon={Mic}
          title="المساعد الصوتي"
          hint="لكبار السن وفاقدي البصر"
          checked={on}
          onChange={(v) => {
            setOn(v);
            setVoiceMode(v);
          }}
        />
        <SwitchRow
          icon={UserRound}
          title="وضع كبار السن داخل نيمو"
          hint="ردود صوتية تلقائية وأزرار أكبر"
          checked={senior}
          onChange={(v) => setSeniorMode(v)}
        />
      </SettingsSection>

      <SettingsSection title="الصوت والمظهر">
        <SoundToggle />
        <ThemeSetting />
      </SettingsSection>

      <SettingsSection title="الحساب والبيانات">
        <AccountDeletion />
      </SettingsSection>

      <SettingsSection title="عن سند">
        <LinkRow icon={ShieldCheck} to="/privacy" title="سياسة الخصوصية" />
        <LinkRow icon={FileText} to="/terms" title="شروط الاستخدام" />
        <LinkRow icon={UserRound} to="/developer" title="عن المطوّر" hint="أسامة سند — مؤسس سند" />
      </SettingsSection>

      <p className="mt-6 text-center text-xs text-muted-foreground" dir="ltr">
        SANAD {APP_VERSION_LABEL}
      </p>
    </main>
  );
}
