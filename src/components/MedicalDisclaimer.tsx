import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const VOICE_DISCLAIMER =
  "تنبيه: المساعد الصوتي يقدم توجيهاً استرشادياً ولا يحل محل الطبيب المختص. في حالات الطوارئ اتصل بـ 123 فوراً.";

/** Reusable medical disclaimer notice with a link to the full /terms page. */
export function MedicalDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p className="text-xs leading-relaxed text-foreground">
          {!compact &&
            "سَنَد أداة تنظيمية ولا تقدم استشارات طبية، والمساعد يقدم توجيهاً استرشادياً فقط. "}
          <Link to="/terms" className="font-bold text-primary underline">
            إخلاء المسؤولية الطبية وشروط الاستخدام
          </Link>
        </p>
      </div>
    </div>
  );
}
