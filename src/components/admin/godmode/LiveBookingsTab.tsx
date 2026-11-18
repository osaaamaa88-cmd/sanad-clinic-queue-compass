import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, XCircle } from "lucide-react";
import { godListBookings, godUpdateBooking } from "@/lib/godmode.functions";
import { Pager, SearchBox } from "./godmode-shared";
import { run, useGodList } from "./godmode-utils";

type BookingRow = {
  id: string;
  patient_name: string | null;
  day_label: string | null;
  slot: string | null;
  queue_number: number | null;
  status: string | null;
  clinics?: { doctor: string | null } | null;
};

export function LiveBookingsTab() {
  const list = useServerFn(godListBookings);
  const update = useServerFn(godUpdateBooking);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ rows: BookingRow[]; hasMore: boolean }>({
    rows: [],
    hasMore: false,
  });
  const load = useCallback(
    () =>
      list({ data: { page, q } })
        .then(setData)
        .catch((e) => toast.error(e.message)),
    [list, page, q],
  );
  useGodList(load, { refreshMs: 20000 });
  return (
    <div className="mt-4 space-y-3">
      <SearchBox
        value={q}
        onChange={(v) => {
          setQ(v);
          setPage(0);
        }}
      />
      <p className="text-xs text-muted-foreground">يتحدث تلقائياً كل 20 ثانية</p>
      {data.rows.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          لا يوجد حجوزات
        </p>
      )}
      {data.rows.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{b.patient_name}</p>
              <p className="text-xs text-muted-foreground">
                {b.clinics?.doctor} • {b.day_label} {b.slot} • #{b.queue_number}
              </p>
            </div>
            <span
              className={`h-fit rounded-full px-2 py-0.5 text-xs font-bold ${b.status === "cancelled" ? "bg-destructive/15 text-destructive" : "bg-secondary"}`}
            >
              {b.status === "cancelled" ? "ملغي" : b.status}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                const day = prompt("اليوم الجديد", b.day_label ?? "");
                if (day === null) return;
                const slot = prompt("الميعاد الجديد", b.slot ?? "");
                if (slot === null) return;
                if (
                  await run(
                    () => update({ data: { id: b.id, dayLabel: day, slot } }),
                    "تم تعديل الموعد",
                  )
                )
                  load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl border border-border py-2 text-xs font-bold"
            >
              <CalendarClock className="h-3.5 w-3.5" /> إعادة جدولة
            </button>
            <button
              disabled={b.status === "cancelled"}
              onClick={async () => {
                if (!confirm("إلغاء الحجز؟")) return;
                if (
                  await run(() => update({ data: { id: b.id, status: "cancelled" } }), "تم الإلغاء")
                )
                  load();
              }}
              className="flex items-center justify-center gap-1 rounded-xl bg-destructive/10 py-2 text-xs font-bold text-destructive disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> إلغاء إجباري
            </button>
          </div>
        </div>
      ))}
      <Pager page={page} hasMore={data.hasMore} onPage={setPage} />
    </div>
  );
}
