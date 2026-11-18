import { Link } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Star, Stethoscope, Route as RouteIcon } from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import { getSpecialty, type Clinic } from "@/lib/mock-data";

/** بطاقة عيادة في قائمة نتائج البحث (غير المستشفيات). */
export function ClinicListCard({ c }: { c: Clinic }) {
  const s = getSpecialty(c.specialtyId);
  const SpecIcon = (s && specialtyIcons[s.id]) || Stethoscope;
  return (
    <Link
      to="/patient/clinic/$id"
      params={{ id: c.id }}
      className="block rounded-3xl tile-3d border border-border bg-card p-4 transition hover:shadow-soft"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
          <SpecIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{c.doctor}</p>
            {c.availableNow && (
              <span className="rounded-full bg-success px-2 py-0.5 text-xs font-bold text-success-foreground">
                متاح
              </span>
            )}
          </div>
          {c.isDemo && (
            <span className="mt-1 inline-flex rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
              بيانات تجريبية
            </span>
          )}
          <p className="text-xs text-muted-foreground">{s?.name}</p>
          <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="line-clamp-2">
              {c.address} — {c.area}
            </span>
          </p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {c.isDemo ? (
                <span className="text-xs font-bold text-warning">تقييم تجريبي</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {c.rating}
                </span>
              )}
              <span className="flex items-center gap-1">
                <RouteIcon className="h-3 w-3" /> {c.distanceKm} كم
              </span>
            </div>
            <span className="rounded-lg bg-primary-soft px-2 py-1 text-sm font-extrabold text-primary">
              {c.price} ج
            </span>
          </div>
          <span className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl gradient-primary py-2.5 text-sm font-extrabold text-primary-foreground shadow-soft">
            عرض الطبيب والتواصل <ChevronLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
