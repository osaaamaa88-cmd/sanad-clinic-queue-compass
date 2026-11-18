import { useEffect } from "react";
import { toast } from "sonner";

/**
 * ينفّذ إجراءً خادمًا ويعرض toast نجاح/خطأ.
 * يرجع true عند النجاح حتى يعيد المتصل تحميل القائمة.
 */
export const run = async (fn: () => Promise<unknown>, ok: string) => {
  try {
    await fn();
    toast.success(ok);
    return true;
  } catch (e) {
    toast.error((e as Error).message || "حصل خطأ");
    return false;
  }
};

/**
 * نمط التحميل المشترك لقوائم وضع المالك: تحميل مؤجَّل (debounce) عند
 * تغيّر دالة التحميل، مع تحديث دوري اختياري.
 * يطابق تمامًا السلوك السابق في UsersTab وLiveBookingsTab.
 */
export function useGodList(load: () => void, opts?: { debounceMs?: number; refreshMs?: number }) {
  const debounceMs = opts?.debounceMs ?? 250;
  const refreshMs = opts?.refreshMs;
  useEffect(() => {
    const t = setTimeout(load, debounceMs);
    return () => clearTimeout(t);
  }, [load, debounceMs]);
  useEffect(() => {
    if (!refreshMs) return;
    const i = setInterval(load, refreshMs);
    return () => clearInterval(i);
  }, [load, refreshMs]);
}
