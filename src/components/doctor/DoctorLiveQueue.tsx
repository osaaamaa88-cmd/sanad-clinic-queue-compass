import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardList, Megaphone, Pill } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listBookingsForClinic, updateBookingStatus, type Booking } from "@/lib/mock-data";
import { kindOf, liveQueue, URGENT_MARK } from "@/lib/clinic-queue";
import { playNotification } from "@/lib/sounds";

const BADGE = {
  urgent: { label: "🚨 مستعجل", cls: "bg-destructive text-destructive-foreground animate-pulse motion-reduce:animate-none" },
  followup: { label: "🔄 إعادة كشف", cls: "bg-primary/15 text-primary" },
  new: { label: "🩺 كشف جديد", cls: "bg-success/15 text-success" },
} as const;

/** طابور الانتظار المباشر للطبيب: المستعجل أولاً، وأزرار استدعاء/ملف/روشتة/إنهاء. */
export function DoctorLiveQueue({ clinicId, onPrescribe }: { clinicId: string; onPrescribe: (name: string) => void }) {
  const [rows, setRows] = useState<Booking[]>([]);
  const [open, setOpen] = useState<Booking | null>(null);

  const refresh = useCallback(async () => setRows(await listBookingsForClinic(clinicId)), [clinicId]);

  useEffect(() => {
    void refresh();
    const ch = supabase
      .channel(`doctor-queue-${clinicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `clinic_id=eq.${clinicId}` }, () => void refresh())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [clinicId, refresh]);

  const set = async (b: Booking, status: Booking["status"]) => {
    if (!(await updateBookingStatus(b.id, status))) return toast.error("تعذر التحديث. حاول مرة أخرى.");
    if (status === "in") { playNotification(); toast.success(`تم استدعاء ${b.patientName} 📢`); }
    if (status === "done") toast.success("تم الكشف ✅");
    await refresh();
  };

  const queue = liveQueue(rows);
  const btn = "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-2xl text-[11px] font-bold active:scale-95";

  return (
    <section className="rounded-3xl tile-3d border border-border bg-card p-4" aria-label="طابور الانتظار المباشر">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-extrabold">طابور اليوم</h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{queue.length} منتظر</span>
      </div>
      {queue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد مرضى في الانتظار</p>}
      <ul className="space-y-2">
        {queue.map((b) => {
          const k = BADGE[kindOf(b)];
          return (
            <li key={b.id} className={`rounded-2xl border p-3 ${b.status === "in" ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-extrabold">#{b.queueNumber} {b.patientName}</p>
                  <p className="text-xs text-muted-foreground">{b.slot.replace(URGENT_MARK, "").trim()}{b.status === "in" ? " · بالداخل" : ""}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${k.cls}`}>{k.label}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button onClick={() => set(b, "in")} className={`${btn} bg-primary text-primary-foreground`}><Megaphone className="h-4 w-4" /> استدعاء</button>
                <button onClick={() => setOpen(b)} className={`${btn} border border-border bg-secondary`}><ClipboardList className="h-4 w-4" /> الملف</button>
                <button onClick={() => onPrescribe(b.patientName)} className={`${btn} border border-border bg-secondary`}><Pill className="h-4 w-4" /> روشتة</button>
                <button onClick={() => set(b, "done")} className={`${btn} bg-success text-success-foreground`}><CheckCircle2 className="h-4 w-4" /> تم</button>
              </div>
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-background/70 backdrop-blur sm:place-items-center" onClick={() => setOpen(null)}>
          <div className="w-full max-w-sm rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h3 className="text-lg font-black">{open.patientName}</h3>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{open.patientPhone}</p>
            <p className="mt-2 text-sm">رقم الدور: <b>#{open.queueNumber}</b> · كود: <b>{open.code}</b></p>
            <p className="mt-3 rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
              البيانات الطبية (الفصيلة والحساسية) تظهر للاستقبال عند مسح كارت سند من موبايل المريض.
            </p>
            <button onClick={() => setOpen(null)} className="mt-4 min-h-11 w-full rounded-2xl bg-primary font-bold text-primary-foreground">إغلاق</button>
          </div>
        </div>
      )}
    </section>
  );
}
