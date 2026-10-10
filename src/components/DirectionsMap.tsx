import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Pt = { lat: number; lng: number };
export type RouteInfo = { km: number; min: number } | null;

export function DirectionsMap({ from, to, onRoute }: { from: Pt | null; to: Pt; onRoute: (r: RouteInfo, err?: boolean) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const layer = useRef<import("leaflet").LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !el.current || map.current) return;
      map.current = L.map(el.current, { zoomControl: true }).setView([to.lat, to.lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map.current);
      layer.current = L.layerGroup().addTo(map.current);
      setReady(true);
    })();
    return () => {
      off = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      const g = layer.current!;
      g.clearLayers();
      L.circleMarker([to.lat, to.lng], { radius: 10, color: "#dc2626", fillOpacity: 0.9 }).addTo(g);
      if (!from) return;
      L.circleMarker([from.lat, from.lng], { radius: 8, color: "#2563eb", fillOpacity: 0.9 }).addTo(g);
      try {
        const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
        const j = await r.json();
        const route = j.routes?.[0];
        if (off || !route) throw new Error("no route");
        const line = L.polyline(route.geometry.coordinates.map(([x, y]: [number, number]) => [y, x]), { weight: 6, color: "#2563eb" }).addTo(g);
        map.current?.fitBounds(line.getBounds(), { padding: [40, 40] });
        onRoute({ km: route.distance / 1000, min: route.duration / 60 });
      } catch {
        if (off) return;
        const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { dashArray: "6 8", color: "#2563eb" }).addTo(g);
        map.current?.fitBounds(line.getBounds(), { padding: [40, 40] });
        onRoute(null, true);
      }
    })();
    return () => {
      off = true;
    };
  }, [ready, from?.lat, from?.lng, to.lat, to.lng]);

  return <div ref={el} className="h-full w-full" />;
}
