import { useEffect, useState } from "react";
import { X, Megaphone, Wrench } from "lucide-react";
import { getAppSettings } from "@/lib/godmode.functions";

type S = { maintenance: boolean; broadcast: string; broadcast_tone: string; updated_at: string };

export function BroadcastBanner() {
  const [s, setS] = useState<S | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => {
    setDismissed(localStorage.getItem("sanad-broadcast-dismissed"));
    const load = () =>
      getAppSettings()
        .then((r) => setS(r as S))
        .catch(() => {});
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);
  if (!s) return null;
  const key = `${s.updated_at}|${s.broadcast}`;
  const showMsg = s.broadcast && dismissed !== key;
  if (!s.maintenance && !showMsg) return null;
  const tone =
    s.broadcast_tone === "urgent"
      ? "bg-destructive text-destructive-foreground"
      : s.broadcast_tone === "warn"
        ? "bg-warning text-warning-foreground"
        : "bg-primary text-primary-foreground";
  return (
    <div className="fixed inset-x-0 top-0 z-[120] space-y-px" dir="rtl">
      {s.maintenance && (
        <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-xs font-bold text-warning-foreground">
          <Wrench className="h-4 w-4" /> التطبيق في وضع الصيانة حالياً — بعض الخدمات قد لا تعمل
        </div>
      )}
      {showMsg && (
        <div className={`flex items-center gap-2 px-4 py-2 text-xs font-bold ${tone}`}>
          <Megaphone className="h-4 w-4 shrink-0" />
          <p className="flex-1">{s.broadcast}</p>
          <button
            aria-label="إغلاق"
            onClick={() => {
              localStorage.setItem("sanad-broadcast-dismissed", key);
              setDismissed(key);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
