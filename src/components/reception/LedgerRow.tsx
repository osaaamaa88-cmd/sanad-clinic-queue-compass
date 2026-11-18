import { BellRing, Hourglass, LogIn, X } from "lucide-react";
import type { Booking } from "@/lib/mock-data";
import { SheetBtn } from "./SheetBtn";

export function LedgerRow({
  booking: r,
  index,
  recentlyCalled,
  onSetStatus,
  onCallPatient,
}: {
  booking: Booking;
  index: number;
  recentlyCalled: boolean;
  onSetStatus: (b: Booking, status: Booking["status"]) => void;
  onCallPatient: (b: Booking) => void;
}) {
  return (
    <div
      className={`border-b border-dashed border-border px-3 py-3 ${
        r.status === "in"
          ? "bg-primary-soft"
          : r.status === "cancelled"
            ? "opacity-50"
            : r.status === "done"
              ? "bg-secondary/40"
              : ""
      }`}
    >
      <div className="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem] items-center gap-2">
        <span className="text-sm font-black text-muted-foreground">
          {r.queueNumber || index + 1}
        </span>
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-bold ${
              r.status === "cancelled" ? "line-through" : ""
            }`}
          >
            {r.patientName}
            {recentlyCalled && (
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {r.patientPhone || "بدون رقم"} • {r.code} • {r.slot || "—"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-center text-xs font-bold ${
            r.visitType === "followup"
              ? "bg-warning/20 text-warning"
              : "bg-primary-soft text-primary"
          }`}
        >
          {r.visitType === "followup" ? "استشارة" : "كشف جديد"}
        </span>
        <span className="text-center text-xs font-bold text-muted-foreground">
          {r.status === "in"
            ? "جوه"
            : r.status === "done"
              ? "خلص"
              : r.status === "cancelled"
                ? "ملغي"
                : "منتظر"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 print:hidden">
        <SheetBtn
          active={r.status === "in"}
          onClick={() => onSetStatus(r, "in")}
          tone="primary"
          icon={LogIn}
          label="تم الدخول"
        />
        <SheetBtn
          active={r.status === "waiting"}
          onClick={() => onSetStatus(r, "waiting")}
          tone="warn"
          icon={Hourglass}
          label="انتظار"
        />
        <SheetBtn
          active={r.status === "cancelled"}
          onClick={() => onSetStatus(r, "cancelled")}
          tone="danger"
          icon={X}
          label="إلغاء"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 print:hidden">
        {r.status === "waiting" && (
          <button
            type="button"
            onClick={() => onCallPatient(r)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground active:scale-95 ${
              recentlyCalled ? "animate-pulse" : ""
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            نداء
          </button>
        )}
      </div>
      {r.status === "in" && (
        <button
          onClick={() => onSetStatus(r, "done")}
          className="mt-1.5 w-full rounded-lg bg-success py-1.5 text-xs font-bold text-success-foreground print:hidden"
        >
          خلص الكشف ✓
        </button>
      )}
    </div>
  );
}
