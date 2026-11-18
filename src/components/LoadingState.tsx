import { Loader2 } from "lucide-react";

/** حالة التحميل الكاملة للصفحة — نفس الكتلة في 4 صفحات
 * (doctor.login و doctor.index و reception و doctor-settings). */
export function LoadingState() {
  return (
    <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
    </div>
  );
}
