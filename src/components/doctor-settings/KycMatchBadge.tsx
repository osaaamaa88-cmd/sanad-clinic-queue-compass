import { AlertTriangle, Check } from "lucide-react";
import type { KycCheck } from "@/lib/kyc-match";

export function KycMatchBadge({ result }: { result: KycCheck }) {
  if (result === "match") {
    return (
      <span className="flex shrink-0 items-center gap-1 font-bold text-success">
        <Check className="h-3.5 w-3.5" /> مطابق
      </span>
    );
  }
  if (result === "mismatch") {
    return (
      <span className="flex shrink-0 items-center gap-1 font-bold text-warning">
        <AlertTriangle className="h-3.5 w-3.5" /> راجع البيانات
      </span>
    );
  }
  return (
    <span className="shrink-0 text-[10px] text-muted-foreground">لا توجد بيانات للمقارنة</span>
  );
}
