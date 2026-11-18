import { Link } from "@tanstack/react-router";
import { Star, Users } from "lucide-react";
import { defaultDoctorAvatar } from "@/lib/default-avatars";
import { specialties, type Clinic } from "@/lib/mock-data";
import { type ClinicProfileExtras } from "@/lib/clinic-profile";
import { Button } from "@/components/ui/button";

/* كبسولة عيادة زجاجية للكواروسيل الأفقي */
export function ClinicCapsule({
  clinic,
  profile,
  onQuickBook,
}: {
  clinic: Clinic;
  profile?: ClinicProfileExtras | undefined;
  onQuickBook?: (clinic: Clinic) => void;
}) {
  const specialty = specialties.find((item) => item.id === clinic.specialtyId);
  const rating = profile?.reviewsCount ? profile.ratingAvg : clinic.rating;
  return (
    <article className="group flex w-64 shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-3 text-right shadow-soft transition active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        to="/patient/clinic/$id"
        params={{ id: clinic.id }}
        className="flex min-w-0 items-start gap-2.5"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft text-primary">
          <img
            src={profile?.avatarUrl || defaultDoctorAvatar()}
            alt={clinic.doctor}
            className="h-full w-full object-cover"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{clinic.doctor}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {specialty?.name} • {clinic.area}
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs font-bold text-warning">
            {clinic.isDemo ? (
              "بيانات تجريبية"
            ) : (
              <>
                <Star className="h-3 w-3 fill-warning" />
                {rating ? rating.toFixed(1) : "جديد"}
              </>
            )}
            <span className="text-muted-foreground">• {clinic.distanceKm.toFixed(1)} كم</span>
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {clinic.waitingCount} منتظر
          </span>
        </span>
      </Link>
      <Button
        size="sm"
        onClick={() => onQuickBook?.(clinic)}
        className="btn-liquid-primary mt-2.5 w-full rounded-full py-2 text-xs font-extrabold transition active:scale-95"
      >
        حجز سريع
      </Button>
    </article>
  );
}
