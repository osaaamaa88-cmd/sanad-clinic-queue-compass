import { createFileRoute, ClientOnly, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronRight, Navigation, Clock } from "lucide-react";
import { getPatientLocation } from "@/lib/patient-location";
import type { RouteInfo } from "@/components/DirectionsMap";

const DirectionsMap = lazy(() =>
  import("@/components/DirectionsMap").then((m) => ({ default: m.DirectionsMap })),
);

export const Route = createFileRoute("/directions")({
  staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>) => ({
    lat: Number(s.lat) || 30.0444,
    lng: Number(s.lng) || 31.2357,
    name: typeof s.name === "string" ? s.name : "",
  }),
  head: () => ({
    meta: [
      { title: "الاتجاهات | سند" },
      {
        name: "description",
        content: "مسار الطريق من موقعك للمستشفى أو العيادة مع المسافة ووقت الوصول.",
      },
      { property: "og:title", content: "الاتجاهات | سند" },
      { property: "og:description", content: "شوف طريقك للمستشفى على الخريطة داخل سند." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DirectionsPage,
});

function DirectionsPage() {
  const { lat, lng, name } = Route.useSearch();
  const router = useRouter();
  const [from, setFrom] = useState<{ lat: number; lng: number } | null>(null);
  const [info, setInfo] = useState<RouteInfo>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const s = getPatientLocation();
    setFrom({ lat: s.lat, lng: s.lng });
    navigator.geolocation?.getCurrentPosition(
      (p) => setFrom({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 8000, enableHighAccuracy: true },
    );
  }, []);

  return (
    <div dir="rtl" className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-2 border-b bg-card p-3">
        <button
          onClick={() => router.history.back()}
          aria-label="رجوع"
          className="rounded-full p-2 hover:bg-secondary"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">الاتجاهات إلى</p>
          <h1 className="truncate font-extrabold">{name || "الوجهة"}</h1>
        </div>
      </header>
      <div className="relative flex-1">
        <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-full animate-pulse bg-muted" />}>
            <DirectionsMap
              from={from}
              to={{ lat, lng }}
              onRoute={(r, e) => {
                setInfo(r);
                setErr(!!e);
              }}
            />
          </Suspense>
        </ClientOnly>
      </div>
      <div className="border-t bg-card p-4 pb-6">
        {info ? (
          <div className="flex items-center justify-around text-center">
            <div>
              <Navigation className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-lg font-extrabold">{info.km.toFixed(1)} كم</p>
              <p className="text-xs text-muted-foreground">المسافة</p>
            </div>
            <div>
              <Clock className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-lg font-extrabold">
                {Math.max(1, Math.round(info.min))} دقيقة
              </p>
              <p className="text-xs text-muted-foreground">وقت الوصول بالعربية</p>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {err ? "تعذر رسم الطريق، الخط المتقطع يوضح الاتجاه فقط." : "جارِ حساب الطريق..."}
          </p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          في الطوارئ اتصل بالإسعاف 123
        </p>
      </div>
    </div>
  );
}
