import { LinkRow, SettingsSection } from "@/components/settings/SettingsBits";
import { BookOpen, ClipboardList, Eye, MessagesSquare, Sparkles, Tv } from "lucide-react";

export function DoctorQuickTools({ clinicId }: { clinicId: string }) {
  return (
    <SettingsSection title="أدوات العيادة">
      <div className="grid grid-cols-2 gap-3">
        <LinkRow icon={ClipboardList} to="/reception" title="الاستقبال" hint="طابور اليوم" />
        <LinkRow
          icon={Tv}
          to="/tv/$id"
          params={{ id: clinicId }}
          title="شاشة الانتظار"
          hint="للتلفزيون"
        />
        <LinkRow icon={MessagesSquare} to="/messages" title="الرسائل" hint="محادثات المرضى" />
        <LinkRow icon={Sparkles} to="/doctor/stories" title="قصص العيادة" hint="ستوري وهايلايت" />
        <LinkRow icon={BookOpen} to="/reception" title="دفتر الحجز" hint="مواعيد المرضى" />
        <LinkRow
          icon={Eye}
          to="/patient/clinic/$id"
          params={{ id: clinicId }}
          title="صفحتي للمرضى"
          hint="معاينة البروفايل"
        />
      </div>
    </SettingsSection>
  );
}
