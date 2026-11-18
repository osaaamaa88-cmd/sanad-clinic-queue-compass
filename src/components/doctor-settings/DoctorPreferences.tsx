import { ChangePasswordCard } from "@/components/settings/ChangePasswordCard";
import { LinkRow, SettingsSection, SwitchRow } from "@/components/settings/SettingsBits";
import { usePrefs } from "@/hooks/use-prefs";
import { SoundToggle, ThemeSetting } from "@/components/SoundControls";
import { BellRing, FileText, Megaphone, ShieldCheck } from "lucide-react";

export function DoctorPreferences() {
  const [prefs, update] = usePrefs();
  return (
    <div className="mt-6">
      <SettingsSection title="الأمان">
        <ChangePasswordCard />
      </SettingsSection>

      <SettingsSection title="التنبيهات">
        <SwitchRow
          icon={BellRing}
          title="نغمة عند تسجيل مريض جديد"
          checked={prefs.newPatientChime}
          onChange={(v) => update("newPatientChime", v)}
        />
        <SwitchRow
          icon={Megaphone}
          title="النداء الصوتي في الاستقبال"
          hint="ينطق رقم الدور عند «التالي»"
          checked={prefs.receptionVoiceCall}
          onChange={(v) => update("receptionVoiceCall", v)}
        />
      </SettingsSection>
      <SettingsSection title="الصوت والمظهر">
        <SoundToggle />
        <ThemeSetting />
      </SettingsSection>
      <SettingsSection title="عن سند">
        <LinkRow icon={ShieldCheck} to="/privacy" title="سياسة الخصوصية" />
        <LinkRow icon={FileText} to="/terms" title="شروط الاستخدام" />
      </SettingsSection>
    </div>
  );
}
