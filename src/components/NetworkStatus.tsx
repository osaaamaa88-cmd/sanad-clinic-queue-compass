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
    <div className="fixed left-3 top-3 z-[60]" role="status" aria-live="polite">
      <div
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-soft ${
          offline ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
        }`}
      >
        {offline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
        {offline ? "وضع عدم الاتصال" : "تم استرجاع الاتصال"}
        {offline && (
          <a href="tel:123" className="mr-1 rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground">
            🚑 123
          </a>
        )}
      </div>
    </div>
  );
}
