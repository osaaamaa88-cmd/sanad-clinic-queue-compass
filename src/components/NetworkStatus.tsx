import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/** Top toast for connectivity problems + a short "back online" confirmation. */
export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      setJustBack(true);
      window.setTimeout(() => setJustBack(false), 2500);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline && !justBack) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center px-3">
      <div
        className={`flex max-w-[92vw] items-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold shadow-soft ${
          offline
            ? "bg-destructive text-destructive-foreground"
            : "bg-success text-success-foreground"
        }`}
      >
        {offline ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        {offline ? "تعذر الاتصال بالشبكة، جاري إعادة المحاولة…" : "تم استرجاع الاتصال بالشبكة"}
      </div>
    </div>
  );
}
