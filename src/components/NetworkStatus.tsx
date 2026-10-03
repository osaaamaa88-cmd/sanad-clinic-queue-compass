import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

/** Top toast for connectivity problems + a short "back online" confirmation. */
export function NetworkStatus() {
  const [offline, setOffline] = useState(false);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") setOffline(!navigator.onLine);
    // Offline support: only on the real published app (not inside the editor preview or dev).
    const host = window.location.hostname;
    const inPreview = host.startsWith("id-preview--") || host === "localhost" || window.self !== window.top;
    if ("serviceWorker" in navigator) {
      if (import.meta.env.PROD && !inPreview) {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      } else {
        navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      }
    }
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
        {offline
          ? "وضع أوفلاين: الطوارئ والأدوية والروشتة شغالة، والرسائل تحتاج إنترنت"
          : "تم استرجاع الاتصال بالشبكة"}
      </div>
    </div>
  );
}
