import { Link } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Navigation, Phone, Route as RouteIcon } from "lucide-react";
import { directionsPath } from "@/lib/directions";
import { HOSPITAL_TYPES } from "@/lib/hospitals.functions";
import type { Clinic } from "@/lib/mock-data";
import { Crescent } from "./Crescent";
import { LocationBadge } from "./LocationBadge";

export function HospitalCard({ c }: { c: Clinic }) {
  return (
    <div className="overflow-hidden rounded-3xl tile-3d border border-border bg-card shadow-soft transition hover:border-destructive/40">
      <Link to="/hospital/$id" params={{ id: c.id }} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-destructive to-destructive/70 text-destructive-foreground shadow-soft">
            <Crescent className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-extrabold leading-snug">{c.doctor}</p>
            <p className="mt-0.5 text-xs font-semibold text-destructive">
              مستشفى حكومي · {HOSPITAL_TYPES[c.hospitalType ?? ""] ?? "حكومي"}
            </p>
            <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-1">
                {c.area} — {c.address}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold">
                <RouteIcon className="h-3 w-3" /> {c.distanceKm} كم
              </span>
              {c.availableNow && (
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                  طوارئ 24 ساعة
                </span>
              )}
              <LocationBadge approx={!!c.approxLocation} />
            </div>
          </div>
          <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
      <div className="grid grid-cols-2 border-t border-border">
        <a
          href={`tel:${c.phone}`}
          className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-extrabold text-destructive hover:bg-destructive/5"
        >
          <Phone className="h-3.5 w-3.5" /> اتصال
        </a>
        <a
          href={directionsPath(c.lat, c.lng, c.doctor)}
          className="flex items-center justify-center gap-1.5 border-r border-border py-2.5 text-xs font-bold hover:bg-secondary"
        >
          <Navigation className="h-3.5 w-3.5" /> الاتجاهات
        </a>
      </div>
    </div>
  );
}
