import { BellRing } from "lucide-react";

export type PatientCallModalProps = {
  patientName: string;
  doctorName: string;
  queueNumber: number;
  room?: string;
  onAcknowledge: () => void;
};

export function PatientCallModal({
  patientName,
  doctorName,
  queueNumber,
  room,
  onAcknowledge,
}: PatientCallModalProps) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 animate-in fade-in duration-300 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-primary/30 bg-card/90 p-6 text-center shadow-2xl backdrop-blur-2xl">
        {/* تأثير توهج خلفي خفيف */}
        <div className="absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />

        {/* أيقونة النداء بنمط الرادار الموجي */}
        <div className="relative mx-auto mb-4 grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 duration-1000" />
          <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/40">
            <BellRing className="h-8 w-8 animate-bounce" />
          </span>
        </div>

        <h3 className="text-xl font-black text-foreground">دورك حان الآن يا {patientName}! 🩺</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          د. {doctorName} جاهز لاستقبالك في غرفة الكشف.
        </p>

        <div className="my-5 rounded-2xl border border-border/80 bg-secondary/50 p-3.5 text-xs font-bold text-foreground">
          <div className="flex items-center justify-between border-b border-border/40 py-1">
            <span className="text-muted-foreground">رقم الدور:</span>
            <span className="text-base font-extrabold text-primary">#{queueNumber}</span>
          </div>
          <div className="flex items-center justify-between py-1 pt-2">
            <span className="text-muted-foreground">المكان:</span>
            <span>{room || "غرفة الكشف الرئيسية"}</span>
          </div>
        </div>

        <button
          onClick={onAcknowledge}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 hover:brightness-110"
        >
          🚶‍♂️ أنا متجه لغرفة الكشف
        </button>
      </div>
    </div>
  );
}

export default PatientCallModal;
