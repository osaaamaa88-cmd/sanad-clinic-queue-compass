import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { godListReports, godModerateContent } from "@/lib/report-moderation.functions";

type ModerationRow = {
  postId: string | null;
  commentId: string | null;
  reporterCount: number;
  reasons: string[];
  hiddenAt: string | null;
  excerpt: string;
  author: string;
};

export function ReportsModerationTab() {
  const list = useServerFn(godListReports);
  const act = useServerFn(godModerateContent);
  const [rows, setRows] = useState<ModerationRow[]>([]);
  const [threshold, setThreshold] = useState(3);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    list()
      .then((res: { rows: ModerationRow[]; threshold: number }) => {
        setRows(res.rows);
        setThreshold(res.threshold);
      })
      .catch((e: Error) => toast.error(e.message));
  }, [list]);

  useEffect(load, [load]);

  // كانت تسمّى run فتظلّل دالة الوحدة run ذات التوقيع المختلف؛
  // أُعيدت تسميتها moderate لتوحيد الاسم ومنع الالتباس.
  const moderate = async (row: ModerationRow, action: "hide" | "restore" | "delete" | "reject") => {
    const key = row.postId ?? row.commentId ?? "";
    setBusyId(key);
    try {
      await act({
        data: { postId: row.postId ?? undefined, commentId: row.commentId ?? undefined, action },
      });
      toast.success("تم تنفيذ الإجراء");
      load();
    } catch (e) {
      toast.error((e as Error).message || "تعذر تنفيذ الإجراء");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted-foreground">
        الإخفاء التلقائي بعد {threshold} بلاغات من مستخدمين مختلفين. الأسباب معروضة لكل بلاغ.
      </p>
      {rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا توجد بلاغات
        </p>
      )}
      {rows.map((r) => {
        const key = r.postId ?? r.commentId ?? "";
        const autoHidden = r.reporterCount >= threshold;
        return (
          <div key={key} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-muted-foreground">
                  {r.postId ? "منشور" : "تعليق"} • {r.reporterCount} مبلّغ
                </p>
                {autoHidden && (
                  <span className="mt-1 inline-block rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
                    تم إخفاء هذا المحتوى بانتظار المراجعة
                  </span>
                )}
                <p className="mt-1.5 text-sm text-foreground">{r.excerpt || "—"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  الأسباب: {r.reasons.join(" • ")}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <button
                type="button"
                disabled={busyId === key}
                onClick={() => moderate(r, "hide")}
                className="min-h-9 rounded-xl border border-border bg-secondary px-2 text-xs font-bold transition active:scale-95"
              >
                إخفاء
              </button>
              <button
                type="button"
                disabled={busyId === key}
                onClick={() => moderate(r, "restore")}
                className="min-h-9 rounded-xl border border-border bg-secondary px-2 text-xs font-bold transition active:scale-95"
              >
                استعادة
              </button>
              <button
                type="button"
                disabled={busyId === key}
                onClick={() => moderate(r, "delete")}
                className="min-h-9 rounded-xl border border-destructive/40 bg-destructive/10 px-2 text-xs font-bold text-destructive transition active:scale-95"
              >
                حذف
              </button>
              <button
                type="button"
                disabled={busyId === key}
                onClick={() => moderate(r, "reject")}
                className="min-h-9 rounded-xl border border-border bg-secondary px-2 text-xs font-bold transition active:scale-95"
              >
                رفض
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
