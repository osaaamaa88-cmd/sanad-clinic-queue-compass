import { useEffect } from "react";

/** يستدعي callback فورًا ثم كل ms — نفس نمط الاستطلاع في 4 مواضع
 * (BroadcastBanner و DbHealthTab و SecurityTab و NotificationsBell).
 * يُعاد ضبط المؤقت عندما تتغير هوية callback، كما في الأصل. */
export function usePolling(callback: () => void, ms: number): void {
  useEffect(() => {
    void callback();
    const id = window.setInterval(callback, ms);
    return () => window.clearInterval(id);
  }, [callback, ms]);
}
