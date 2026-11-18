import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Navigation, Phone, Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { directionsPath } from "@/lib/directions";
import { HOSPITAL_TYPES } from "@/lib/hospitals.functions";
import { getSpecialty, type Clinic } from "@/lib/mock-data";
import { Crescent } from "./Crescent";
import { LocationBadge } from "./LocationBadge";

export function ClinicSheet({ clinic, onClose }: { clinic: Clinic; onClose: () => void }) {
  const hospital = clinic.kind === "hospital";
  const specialty = hospital
    ? (HOSPITAL_TYPES[clinic.hospitalType ?? ""] ?? "مستشفى حكومي")
    : getSpecialty(clinic.specialtyId)?.name;
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <section
      aria-label={`معاينة ${clinic.doctor}`}
      className="sanad-map-preview fixed inset-x-3 z-[85] mx-auto max-w-xl rounded-lg border border-border bg-card p-4 shadow-soft animate-sheet-up"
      dir="rtl"
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${hospital ? "bg-destructive/15 text-destructive" : "bg-primary-soft text-primary"}`}
        >
          {hospital ? <Crescent className="h-6 w-6" /> : <Stethoscope className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-extrabold leading-snug">{clinic.doctor}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {hospital ? "مستشفى حكومي · " : ""}
            {specialty}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${clinic.availableNow ? "text-success" : "text-muted-foreground"}`}
          >
            {hospital
              ? clinic.availableNow
                ? "طوارئ 24 ساعة"
                : "مواعيد العمل غير مؤكدة"
              : clinic.availableNow
                ? "متاح الآن"
                : "غير متاح الآن"}
          </p>
        </div>
        <Button size="icon" variant="ghost" aria-label="إغلاق البطاقة" onClick={onClose}>
          <X />
        </Button>
      </div>
      <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
        {clinic.area} — {clinic.address}
      </p>
      {clinic.isDemo && (
        <p className="mt-2 inline-flex rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
          بيانات تجريبية
        </p>
      )}
      {hospital && (
        <div className="mt-2">
          <LocationBadge approx={!!clinic.approxLocation} />
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {clinic.phone ? (
          <Button asChild variant={hospital ? "destructive" : "default"}>
            <a href={`tel:${clinic.phone}`}>
              <Phone /> اتصال
            </a>
          </Button>
        ) : (
          <Button disabled variant="secondary">
            <Phone /> لا يوجد رقم
          </Button>
        )}
        <Button asChild variant="secondary">
          <a href={directionsPath(clinic.lat, clinic.lng, clinic.doctor)}>
            <Navigation /> الاتجاهات
          </a>
        </Button>
      </div>
      <Button asChild variant="link" className="mt-1 h-8 w-full text-xs">
        {hospital ? (
          <Link to="/hospital/$id" params={{ id: clinic.id }}>
            تفاصيل المستشفى <ChevronLeft />
          </Link>
        ) : (
          <Link to="/patient/clinic/$id" params={{ id: clinic.id }}>
            عرض الطبيب <ChevronLeft />
          </Link>
        )}
      </Button>
    </section>
  );
}
