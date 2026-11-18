import { Phone, PlayCircle } from "lucide-react";
import { youtubeId } from "@/lib/youtube";
import { ClinicQrCard } from "@/components/ClinicQrCard";
import type { Clinic } from "@/lib/mock-data";
import type { ClinicProfileExtras } from "@/lib/clinic-profile";

export function ClinicInfoTab({
  clinic,
  extras,
  specName,
}: {
  clinic: Clinic;
  extras: ClinicProfileExtras | null;
  specName: string;
}) {
  return (
    <div className="mt-4 space-y-4">
      {clinic.youtubeUrl && youtubeId(clinic.youtubeUrl) && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <p className="flex items-center gap-2 p-4 pb-3 text-sm font-bold">
            <PlayCircle className="h-4 w-4 text-primary" /> جولة داخل العيادة
          </p>
          <div className="relative aspect-video w-full bg-secondary">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId(clinic.youtubeUrl)}?rel=0`}
              title="فيديو العيادة"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold">نبذة</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {extras?.bio ? extras.bio : "لم تضف العيادة نبذة تعريفية بعد."}
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <Phone className="h-4 w-4 text-primary" /> {clinic.phone || "—"}
        </div>
        <div className="mt-2 rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            آخر تحديث للبيانات:{" "}
            <span className="font-bold text-foreground">
              {new Date(clinic.updatedAt || clinic.submittedAt).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
          <p className="mt-1">
            مصدر البيانات: مُدخلة ومُحدّثة من إدارة العيادة نفسها — يُفضّل تأكيد السعر والموعد
            بالاتصال قبل الزيارة.
          </p>
        </div>
      </div>
      {/* FAQ */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold">أسئلة شائعة</p>
        <div className="mt-2 divide-y divide-border">
          {[
            ["إزاي أحجز؟", "استخدم زر «احجز دورك» أعلى صفحة العيادة."],
            ["أتابع دوري؟", "بعد تأكيد الحجز، افتح «تابع دورك» من شاشة نجاح الحجز."],
            ["الدفع إزاي؟", "الدفع نقداً في العيادة، مفيش أي دفع أونلاين."],
            [
              "لو اتأخرت أو عايز ألغي؟",
              "كلّم العيادة على الواتساب أو الرقم المباشر وهيتم تعديل حجزك.",
            ],
          ].map(([q, a]) => (
            <details key={q} className="py-2">
              <summary className="cursor-pointer text-sm font-bold">{q}</summary>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
      {/* Print card + QR */}
      <ClinicQrCard clinic={clinic} specName={specName} />
    </div>
  );
}
