import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { adminDbHealth } from "@/lib/health.functions";

type Health = Awaited<ReturnType<typeof adminDbHealth>>;

export function DbHealthTab() {
  const get = useServerFn(adminDbHealth);
  const [h, setH] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => {
    get()
      .then((r) => {
        setH(r);
        setErr(null);
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [get]);
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const down = err || (h && !h.ok);
  return (
    <div className="mt-4 space-y-4">
      {h && h.repeated.length > 0 && (
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2 font-bold text-destructive">
            <AlertTriangle className="h-5 w-5" /> تنبيه: أعطال متكررة خلال آخر ساعة
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {h.repeated.map((r) => (
              <li key={r.action}>
                • {r.action}: فشل {r.count} مرات
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <p className="font-bold">حالة قاعدة البيانات</p>
          </div>
          <button onClick={load} className="rounded-full bg-secondary p-2" aria-label="تحديث">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {!h && !err && <p className="mt-3 text-sm text-muted-foreground">جاري الفحص...</p>}
        {(h || err) && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div
              className={`rounded-xl p-3 ${down ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
            >
              {down ? (
                <AlertTriangle className="mx-auto h-5 w-5" />
              ) : (
                <CheckCircle2 className="mx-auto h-5 w-5" />
              )}
              <p className="mt-1 text-xs font-bold">{down ? "متعطلة" : "تعمل"}</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-lg font-black">{h?.latencyMs ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">زمن الاستجابة ms</p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-lg font-black">{h?.lastDay ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground">أعطال 24 ساعة</p>
            </div>
          </div>
        )}
        {(err || h?.error) && <p className="mt-2 text-xs text-destructive">{err ?? h?.error}</p>}
        {h && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            آخر فحص: {new Date(h.checkedAt).toLocaleTimeString("ar-EG")} • يتحدث كل 30 ثانية
          </p>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-bold">آخر عمليات الحفظ الفاشلة</p>
        {h && h.recent.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">لا توجد أعطال مسجلة ✅</p>
        )}
        <div className="mt-3 space-y-2">
          {h?.recent.map((r) => (
            <div key={r.id} className="rounded-xl bg-secondary p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-bold">{r.action}</span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar-EG")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground break-words">{r.message}</p>
              {r.path && (
                <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                  {r.path}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
