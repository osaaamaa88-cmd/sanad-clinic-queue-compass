import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, AlertTriangle, Activity, Sparkles, Check } from "lucide-react";
import { securityScan, resolveErrorLog } from "@/lib/security.functions";

type Scan = Awaited<ReturnType<typeof securityScan>>;

export function SecurityTab() {
  const scan = useServerFn(securityScan);
  const resolve = useServerFn(resolveErrorLog);
  const [s, setS] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    try { setS(await scan()); setErr(null); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }, [scan]);
  useEffect(() => { run(); const t = setInterval(run, 60_000); return () => clearInterval(t); }, [run]);

  const h = s?.health ?? 0;
  const tone = h >= 90 ? "text-success" : h >= 70 ? "text-warning" : "text-destructive";
  const label = h >= 90 ? "آمن ومستقر" : h >= 70 ? "يحتاج متابعة" : "حالة حرجة";

  return (
    <div className="mt-4 space-y-4">
      {s && !s.hasKey && (
        <div className="rounded-2xl border border-warning bg-warning/10 p-4 text-sm">
          <div className="flex items-center gap-2 font-bold text-warning"><AlertTriangle className="h-5 w-5" /> مفتاح Groq غير مضاف</div>
          <p className="mt-1 text-xs text-muted-foreground">التحليل الذكي متوقف. أضف المفتاح باسم <b dir="ltr">GROQ_API_KEY</b> من إعدادات المشروع ← Secrets، ثم اضغط «فحص حي للسيستم».</p>
        </div>
      )}
      {s?.aiError && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">تعذّر التحليل الذكي: {s.aiError}</p>}
      {err && <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{err}</p>}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><p className="font-bold">صحة النظام</p></div>
          <button onClick={run} disabled={busy} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            <Activity className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} /> {busy ? "جاري الفحص..." : "فحص حي للسيستم"}
          </button>
        </div>
        {s && (
          <>
            <div className="mt-4 flex items-end gap-2">
              <p className={`text-4xl font-black ${tone}`}>{h}%</p>
              <p className={`pb-1 text-sm font-bold ${tone}`}>{label}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full ${h >= 90 ? "bg-success" : h >= 70 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${h}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-2"><p className="text-sm font-black">{s.dbOk ? "تعمل" : "متعطلة"}</p><p className="text-[10px] text-muted-foreground">قاعدة البيانات</p></div>
              <div className="rounded-xl bg-secondary p-2"><p className="text-sm font-black">{s.dbMs}ms</p><p className="text-[10px] text-muted-foreground">زمن الاستجابة</p></div>
              <div className="rounded-xl bg-secondary p-2"><p className="text-sm font-black">{s.activeCount}</p><p className="text-[10px] text-muted-foreground">أعطال نشطة 24س</p></div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">آخر فحص: {new Date(s.checkedAt).toLocaleTimeString("ar-EG")} • يتحدث كل دقيقة</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-3">
        <p className="mb-2 flex items-center gap-1 font-bold"><Sparkles className="h-4 w-4 text-primary" /> سجل الأعطال المباشر</p>
        {s && s.rows.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">لا توجد أعطال مسجلة ✅</p>}
        {s && s.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right text-[11px]">
              <thead className="text-muted-foreground">
                <tr><th className="p-2">الوقت</th><th className="p-2">الشاشة</th><th className="p-2">الخطأ الأصلي</th><th className="p-2">تحليل الذكاء الاصطناعي</th><th className="p-2">الحل المقترح</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {s.rows.map((r) => (
                  <tr key={r.id} className={`border-t border-border align-top ${r.resolved ? "opacity-50" : ""}`}>
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                    <td className="p-2" dir="ltr">{r.screen ?? "—"}</td>
                    <td className="p-2 break-words">{r.message}</td>
                    <td className="p-2">{r.summary_ar ?? <span className="text-muted-foreground">بانتظار التحليل</span>}</td>
                    <td className="p-2">{r.solution_ar ?? "—"}</td>
                    <td className="p-2">
                      {!r.resolved && (
                        <button aria-label="تم الحل" onClick={async () => { await resolve({ data: { id: r.id } }); run(); }} className="rounded-full bg-success/15 p-1.5 text-success"><Check className="h-3.5 w-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
