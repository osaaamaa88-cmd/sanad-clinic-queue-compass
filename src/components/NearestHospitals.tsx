import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Hospital as HospitalIcon, Phone, Navigation, LocateFixed } from "lucide-react";
import { listHospitals, type Hospital } from "@/lib/hospitals.functions";
import { distanceKm, getPatientLocation } from "@/lib/patient-location";

export function NearestHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [gps, setGps] = useState(false);

  useEffect(() => {
    let off = false;
    listHospitals().then((l) => !off && setHospitals(l as Hospital[])).catch(() => {});
    const saved = getPatientLocation();
    setMe({ lat: saved.lat, lng: saved.lng });
    navigator.geolocation?.getCurrentPosition(
      (p) => {
        if (off) return;
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGps(true);
      },
      () => {},
      { timeout: 8000, enableHighAccuracy: true },
    );
    return () => {
      off = true;
    };
  }, []);

  const nearest = useMemo(() => {
    if (!me) return [];
    return hospitals
      .map((h) => ({ h, d: distanceKm(me, { lat: Number(h.lat), lng: Number(h.lng) }) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
  }, [hospitals, me]);

  if (!nearest.length) return null;

  return (
    <section className="mt-4 rounded-3xl bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold">
          <HospitalIcon className="h-5 w-5 text-primary" /> أقرب مستشفى حكومي ليك
        </h2>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <LocateFixed className="h-3 w-3" /> {gps ? "حسب موقعك الحالي" : "حسب منطقتك"}
        </span>
      </div>
      <ul className="space-y-2">
        {nearest.map(({ h, d }) => {
          const phone = h.phone && h.phone !== "123" ? h.phone : h.emergency_phone || "123";
          return (
            <li key={h.id} className="rounded-2xl bg-secondary p-3">
              <Link to="/hospital/$id" params={{ id: h.id }} className="block">
                <p className="font-bold">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {h.governorate} · {d.toFixed(1)} كم عنك
                </p>
              </Link>
              <div className="mt-2 flex gap-2">
                <a href={`tel:${phone}`} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-destructive p-2 text-sm font-bold text-destructive-foreground">
                  <Phone className="h-4 w-4" /> اتصال
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary p-2 text-sm font-bold text-primary-foreground"
                >
                  <Navigation className="h-4 w-4" /> الاتجاهات
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
