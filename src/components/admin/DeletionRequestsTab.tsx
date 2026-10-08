import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { adminListDeletionRequests, adminResolveDeletionRequest } from "@/lib/account.functions";

type Row = {
  id: string;
  user_id: string;
  email: string;
  phone: string;
  status: "pending" | "processed" | "cancelled";
  created_at: string;
  processed_at: string | null;
};

/** Owner view: account & data deletion requests submitted from Settings. */
export function DeletionRequestsTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const list = useServerFn(adminListDeletionRequests);
  const resolve = useServerFn(adminResolveDeletionRequest);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await list();
      setRows(res.rows as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل الطلبات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [list]);

  const markDone = async (id: string) => {
    if (!window.confirm("تأكيد تنفيذ الحذف الكامل وإغلاق الطلب؟")) return;
    setBusyId(id);
    try {
      await resolve({ data: { id } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل إغلاق الطلب");
    } finally {
      setBusyId("");
    }
  };

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-extrabold">
          <Trash2 className="h-4 w-4 text-primary" />
          طلبات حذف الحسابات ({pending.length})
        </p>
        <button
          onClick={() => void load()}
          className="flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-bold"
        >
          <RefreshCw className="h-3 w-3" /> تحديث
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-bold text-destructive">{error}</p>}

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> جاري التحميل…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">مفيش طلبات حذف.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-secondary/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-foreground">
                  {r.email || r.phone || r.user_id.slice(0, 8)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    r.status === "pending"
                      ? "bg-warning/20 text-warning"
                      : r.status === "processed"
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {r.status === "pending" ? "معلّق" : r.status === "processed" ? "منفّذ" : "ملغي"}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {r.phone ? `هاتف: ${r.phone} · ` : ""}
                مطلوب من {new Date(r.created_at).toLocaleString("ar-EG")}
                {r.processed_at ? ` · نُفّذ ${new Date(r.processed_at).toLocaleString("ar-EG")}` : ""}
              </p>
              {r.status === "pending" && (
                <button
                  onClick={() => void markDone(r.id)}
                  disabled={busyId === r.id}
                  className="mt-2 flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 font-bold text-primary disabled:opacity-60"
                >
                  {busyId === r.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  تم تنفيذ الحذف
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        التنفيذ الكامل يشمل حذف سجلات المريض من جداول التطبيق (الحجوزات، المحادثات، التقييمات،
        الإشعارات) وحذف حساب الدخول من لوحة التحكم.
      </p>
    </section>
  );
}
