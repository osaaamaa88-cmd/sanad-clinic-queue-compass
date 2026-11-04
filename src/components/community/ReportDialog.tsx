import { useState } from "react";

export const REPORT_REASONS = [
  { id: "spam", label: "محتوى مزعج أو غير مرغوب" },
  { id: "harassment", label: "إساءة أو مضايقة" },
  { id: "medical_misinformation", label: "معلومة طبية مضللة" },
  { id: "privacy", label: "انتهاك الخصوصية" },
  { id: "other", label: "سبب آخر" },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

export function ReportDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="fixed inset-0 z-[130] grid place-items-center bg-background/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-report-title"
    >
      <form
        className="w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          await onSubmit(reason, details);
          setBusy(false);
        }}
      >
        <div>
          <h2 id="community-report-title" className="text-base font-extrabold">
            الإبلاغ عن محتوى
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">لن يظهر البلاغ لصاحب المحتوى.</p>
        </div>
        <label className="block space-y-2 text-sm font-bold">
          سبب البلاغ
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-bold">
          تفاصيل إضافية (اختياري)
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm font-normal"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-bold"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "جارٍ الإرسال..." : "إرسال البلاغ"}
          </button>
        </div>
      </form>
    </div>
  );
}
