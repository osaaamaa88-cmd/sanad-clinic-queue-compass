import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, HeartPulse, MapPin, Phone, Pill, Siren } from "lucide-react";
import { getSpecialty, type Clinic } from "@/lib/mock-data";
import type { Hospital as HospitalRow } from "@/lib/hospitals.functions";
import type { TriageResult } from "@/lib/triage-local";
import { AMBULANCE_LINE, MENTAL_HEALTH_PORTAL_URL, PSYCH_SUPPORT_LINE } from "@/lib/crisis-support";

type NemoCareCardsProps = {
  showRecommendations: boolean;
  result: TriageResult | null;
  urgent: boolean;
  nearestClinic: { clinic: Clinic; distance: number } | undefined;
  relevantHospital: { hospital: HospitalRow; distance: number } | undefined;
  onChangeLocation: () => void;
  mentionsMedication: boolean;
  mentionsLab: boolean;
  selfHarmFlag: boolean;
  painLevel: number | null;
  /** Rendered between the tools row and the support cards (the breathing card). */
  children?: ReactNode;
};

export function NemoCareCards({
  showRecommendations,
  result,
  urgent,
  nearestClinic,
  relevantHospital,
  onChangeLocation,
  mentionsMedication,
  mentionsLab,
  selfHarmFlag,
  painLevel,
  children,
}: NemoCareCardsProps) {
  return (
    <>
      {showRecommendations && result && (
        <section
          className="order-5 rounded-2xl border border-border bg-card p-4 shadow-sm"
          aria-live="polite"
        >
          <p className="text-xs font-semibold text-muted-foreground">
            {urgent ? "مساعدة طبية قريبة" : "مساعدة قريبة حسب كلامك"}
          </p>
          {!urgent && (
            <p className="mt-1 font-extrabold text-foreground">
              التخصص المقترح: {getSpecialty(result.specialtyIds[0] ?? "")?.name ?? "طب الأسرة"}
            </p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {!urgent && nearestClinic && (
              <Link
                to="/patient/clinic/$id"
                params={{ id: nearestClinic.clinic.id }}
                className="min-h-11 rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-bold text-foreground hover:bg-primary/15"
              >
                أقرب عيادة: {nearestClinic.clinic.doctor} · {nearestClinic.distance.toFixed(1)} كم
              </Link>
            )}
            {!urgent && !nearestClinic && (
              <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                لا توجد عيادة مناسبة متاحة حالياً
              </p>
            )}
            {relevantHospital ? (
              <Link
                to="/hospital/$id"
                params={{ id: relevantHospital.hospital.id }}
                className="min-h-11 rounded-xl bg-secondary px-3 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/80"
              >
                أقرب مستشفى: {relevantHospital.hospital.name} ·{" "}
                {relevantHospital.distance.toFixed(1)} كم
              </Link>
            ) : (
              <p className="rounded-xl bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                بيانات المستشفيات غير متاحة حالياً
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onChangeLocation}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-secondary"
          >
            <MapPin className="h-4 w-4 text-primary" /> تغيير موقعي
          </button>
        </section>
      )}

      {(mentionsMedication || mentionsLab) && (
        <section className="order-5 flex flex-wrap gap-2" aria-label="أدوات صحية مرتبطة بكلامك">
          {mentionsMedication && (
            <Link
              to="/patient/drug-scan"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-950"
            >
              <Pill className="h-4 w-4" /> فحص الدواء أو الروشتة
            </Link>
          )}
          {mentionsLab && (
            <Link
              to="/patient/lab-reader"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-bold text-foreground"
            >
              <HeartPulse className="h-4 w-4" /> قراءة التحاليل
            </Link>
          )}
        </section>
      )}

      {children}

      {selfHarmFlag && (
        <section
          className="order-5 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 shadow-sm"
          role="alert"
          aria-label="دعم نفسي"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-foreground">مش لوحدك — في ناس جاهزة تسمعك</h3>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                اللي بتحس بيه تقيل، بس ممكن يخف. كلّم شخص قريب منك دلوقتي وخليه يفضل معاك، ومش لازم
                تواجه الحاجة دي لوحدك.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <a
              href={`tel:${PSYCH_SUPPORT_LINE}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground transition hover:bg-primary/90"
            >
              <Phone className="h-4 w-4" /> خط الدعم النفسي {PSYCH_SUPPORT_LINE} (٢٤ ساعة)
            </a>
            <a
              href={`tel:${AMBULANCE_LINE}`}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-extrabold text-destructive transition hover:bg-destructive/20"
            >
              <Siren className="h-4 w-4" /> لو في خطر مباشر — الإسعاف {AMBULANCE_LINE}
            </a>
            <a
              href={MENTAL_HEALTH_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-xs font-bold text-foreground transition hover:bg-secondary"
            >
              معلومات ودعم نفسي من وزارة الصحة
            </a>
          </div>
        </section>
      )}

      {(urgent || (painLevel !== null && painLevel >= 8)) && !selfHarmFlag && (
        <section
          className="nemo-emergency order-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 shadow-sm"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-destructive text-destructive-foreground">
              <Siren className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-destructive">
                سلامتك أهم حاجة — اطلب مساعدة طبية عاجلة
              </h3>
              <p className="mt-1 text-xs leading-6 text-destructive">
                لو الألم شديد أو عندك ألم صدر أو صعوبة تنفس أو نزيف، اتصل بالإسعاف فوراً.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <a
              href="tel:123"
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-sm font-extrabold text-destructive-foreground transition hover:bg-destructive/90"
            >
              <Phone className="h-4 w-4" /> اتصل بالإسعاف 123
            </a>
          </div>
        </section>
      )}
    </>
  );
}
