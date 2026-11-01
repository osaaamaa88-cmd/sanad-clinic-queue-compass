import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Clock, Star, Banknote, Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { days, getSpecialty, timeSlots, type Clinic, createBooking } from "@/lib/mock-data";
import {
  ensurePatientAuthIdentity,
  getPatientSession,
  saveBookingLocally,
} from "@/lib/patient-session";
import { PatientAuthModal } from "@/components/PatientAuthModal";

export type QuickBookingDrawerProps = {
  clinic: Clinic | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuickBookingDrawer({ clinic, isOpen, onOpenChange }: QuickBookingDrawerProps) {
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [bookedCode, setBookedCode] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDayIdx(0);
      setSlot("");
      setBookedCode(null);
    }
  }, [isOpen, clinic?.id]);

  const confirm = useCallback(async () => {
    if (!clinic || !slot || submitting) return;

    // التحقق إذا كانت العيادة تجريبية
    if (clinic.isDemo) {
      toast.error("لا يمكن حجز العيادات التجريبية");
      return;
    }

    const who = getPatientSession();
    if (!who) {
      setAuthOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      await ensurePatientAuthIdentity();
      const dayLabel = `${days[dayIdx].label} — ${days[dayIdx].date}`;
      const b = await createBooking({
        clinicId: clinic.id,
        patientName: who.name,
        patientPhone: who.phone,
        dayLabel,
        slot,
      });
      if (b) {
        saveBookingLocally({
          code: b.code,
          clinicId: clinic.id,
          clinicName: clinic.doctor,
          dayLabel,
          slot,
          queueNumber: b.queueNumber,
        });
        setBookedCode(b.code);
        toast.success("تم تأكيد الحجز ✅");
      } else {
        toast.error("تعذر تأكيد الحجز، حاول مرة أخرى");
      }
    } catch (error) {
      console.error("[QuickBookingDrawer] Booking failed:", error);
      toast.error("تعذر بدء جلسة آمنة للحجز. فعّل اتصالك وحاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }, [clinic, dayIdx, slot, submitting]);

  const specialty = clinic ? getSpecialty(clinic.specialtyId) : undefined;

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent>
          {clinic ? (
            <div className="space-y-4" dir="rtl">
              <DrawerHeader className="text-right">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-2xl text-primary">
                    {specialty?.emoji ?? "🩺"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <DrawerTitle className="truncate text-right">{clinic.doctor}</DrawerTitle>
                    <DrawerDescription className="text-right">
                      {specialty?.name ?? "تخصص"} • {clinic.area}
                    </DrawerDescription>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        {clinic.isDemo
                          ? "تقييم تجريبي"
                          : clinic.rating
                            ? clinic.rating.toFixed(1)
                            : "جديد"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5 text-primary" />
                        {clinic.price} ج
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {clinic.waitingCount} منتظر
                      </span>
                    </div>
                  </div>
                </div>
              </DrawerHeader>
              {clinic.isDemo && (
                <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm font-bold text-warning">
                  بيانات تجريبية — لا يمكن إنشاء حجز لهذه العيادة.
                </p>
              )}
              {bookedCode ? (
                <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
                  <p className="mt-2 text-sm font-extrabold text-foreground">تم حجز دورك بنجاح</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    رمز الحجز: <span className="font-bold text-primary">{bookedCode}</span>
                  </p>
                  <Button className="mt-3 w-full" onClick={() => onOpenChange(false)}>
                    تم
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">اختيار اليوم</h3>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {days.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDayIdx(i)}
                          className={`shrink-0 rounded-2xl border px-4 py-2.5 text-center transition active:scale-95 ${
                            dayIdx === i
                              ? "gradient-primary border-transparent text-white shadow-soft"
                              : "border-border bg-card text-foreground hover:bg-secondary"
                          }`}
                        >
                          <div className="text-[11px] opacity-80">{d.label}</div>
                          <div className="mt-0.5 text-xs font-bold">{d.date}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">اختيار الوقت</h3>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {timeSlots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSlot(t)}
                          className={`rounded-xl border py-2.5 text-sm font-bold transition active:scale-95 ${
                            slot === t
                              ? "gradient-primary border-transparent text-white shadow-soft"
                              : "border-border bg-card text-foreground hover:bg-secondary"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DrawerFooter className="px-0">
                    <Button
                      className="w-full"
                      onClick={() => void confirm()}
                      disabled={!slot || submitting || clinic.bookingsClosed || clinic.isDemo}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري تأكيد الحجز…
                        </>
                      ) : clinic.bookingsClosed ? (
                        "الحجز مغلق حالياً"
                      ) : slot ? (
                        <>
                          <CalendarPlus className="h-4 w-4" />
                          تأكيد الحجز — {slot}
                        </>
                      ) : (
                        "اختر الوقت أولاً"
                      )}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline" className="w-full">
                        إغلاق
                      </Button>
                    </DrawerClose>
                  </DrawerFooter>
                </>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              لا توجد بيانات عيادة.
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {authOpen && (
        <PatientAuthModal
          title="بياناتك لتأكيد الدور"
          onClose={() => setAuthOpen(false)}
          onDone={(s) => {
            setAuthOpen(false);
            void confirm();
          }}
        />
      )}
    </>
  );
}

export default QuickBookingDrawer;
