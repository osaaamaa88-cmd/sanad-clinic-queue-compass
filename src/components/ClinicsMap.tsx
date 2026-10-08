import { forwardRef, useEffect, useRef, useState } from "react";
import { Cross, LocateFixed, Maximize, Minus, Plus, Stethoscope } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { cn } from "@/lib/utils";
import type { Clinic } from "@/lib/mock-data";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

type Leaflet = typeof import("leaflet");
export interface ClinicsMapProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  clinics: Clinic[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect: (clinic: Clinic) => void;
  size?: "default" | "compact";
}

function pinIcon(L: Leaflet, clinic: Clinic, active: boolean) {
  const hospital = clinic.kind === "hospital";
  const symbol = hospital
    ? renderToStaticMarkup(<Cross aria-hidden="true" />)
    : renderToStaticMarkup(<Stethoscope aria-hidden="true" />);
  return L.divIcon({
    className: "sanad-marker",
    html: `<span class="sanad-pin ${hospital ? "sanad-pin-hospital" : ""} ${active ? "is-selected" : ""} ${clinic.approxLocation ? "is-approximate" : ""}">${symbol}</span>`,
    iconSize: [36, 36], iconAnchor: [18, 18], tooltipAnchor: [0, -20],
  });
}

/** Clustered clinic and hospital map with keyboard-accessible pins and location controls. */
export const ClinicsMap = forwardRef<HTMLDivElement, ClinicsMapProps>(function ClinicsMap(
  { clinics, center, selectedId, onSelect, size = "default", className, ...props }, ref,
) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const group = useRef<import("leaflet").MarkerClusterGroup | null>(null);
  const patient = useRef<import("leaflet").CircleMarker | null>(null);
  const engine = useRef<Leaflet | null>(null);
  const markers = useRef(new Map<string, { marker: import("leaflet").Marker; clinic: Clinic }>());
  const latest = useRef({ clinics, center, selectedId, onSelect });
  latest.current = { clinics, center, selectedId, onSelect };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fit = (animate = true) => {
    const L = engine.current;
    const instance = map.current;
    if (!L || !instance) return;
    const points = [...markers.current.values()].map(({ marker }) => marker.getLatLng());
    if (points.length) instance.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15, animate: animate && !reducedMotion(), duration: 0.45 });
    else instance.setView(latest.current.center, 13, { animate: animate && !reducedMotion() });
  };

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      // The plugin augments the browser Leaflet instance; never evaluate it during SSR.
      await import("leaflet.markercluster");
      if (disposed || !container.current) return;
      engine.current = L;
      const instance = L.map(container.current, {
        center: latest.current.center, zoom: 13, maxZoom: 19,
        zoomControl: false, attributionControl: false, preferCanvas: true,
        zoomSnap: 1, wheelPxPerZoomLevel: 90, inertia: true,
      });
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, className: "sanad-dark-tiles", keepBuffer: 3, updateWhenZooming: false,
      }).addTo(instance);
      group.current = L.markerClusterGroup({
        maxClusterRadius: 48, disableClusteringAtZoom: 17, showCoverageOnHover: false,
        spiderfyOnMaxZoom: true, removeOutsideVisibleBounds: true,
        animate: !reducedMotion(),
        iconCreateFunction: (cluster) => L.divIcon({
          html: `<span class="sanad-cluster-count">${cluster.getChildCount()}</span>`,
          className: "sanad-cluster", iconSize: [44, 44], iconAnchor: [22, 22],
        }),
      }).addTo(instance);
      const colors = getComputedStyle(container.current);
      patient.current = L.circleMarker(latest.current.center, {
        radius: 7, color: colors.getPropertyValue("--map-pin-ink").trim(), weight: 3,
        fillColor: colors.getPropertyValue("--map-clinic").trim(), fillOpacity: 1,
      }).addTo(instance);
      const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
      observer.observe(container.current);
      instance.on("unload", () => observer.disconnect());
      setReady(true);
    })().catch(() => { if (!disposed) setError(true); });
    return () => {
      disposed = true;
      map.current?.remove(); map.current = null; group.current = null;
      markers.current.clear(); patient.current = null;
    };
  }, []);

  // Keep existing markers and listeners; only add/remove changed directory entries.
  useEffect(() => {
    const L = engine.current;
    const cluster = group.current;
    if (!ready || !L || !cluster) return;
    const valid = clinics.filter((c) => typeof c.lat === "number" && typeof c.lng === "number" && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180);
    const ids = new Set(valid.map((c) => c.id));
    let geometryChanged = false;
    markers.current.forEach(({ marker }, id) => {
      if (!ids.has(id)) { cluster.removeLayer(marker); markers.current.delete(id); geometryChanged = true; }
    });
    const additions: import("leaflet").Marker[] = [];
    valid.forEach((clinic) => {
      const lat = clinic.lat, lng = clinic.lng;
      if (lat === undefined || lng === undefined) return;
      const existing = markers.current.get(clinic.id);
      if (existing) {
        const previous = existing.marker.getLatLng();
        if (previous.lat !== lat || previous.lng !== lng) { cluster.removeLayer(existing.marker); existing.marker.setLatLng([lat, lng]); additions.push(existing.marker); geometryChanged = true; }
        existing.clinic = clinic;
        existing.marker.setIcon(pinIcon(L, clinic, clinic.id === latest.current.selectedId));
        return;
      }
      const marker = L.marker([lat, lng], { icon: pinIcon(L, clinic, clinic.id === latest.current.selectedId), title: clinic.doctor, alt: clinic.doctor, keyboard: true });
      const label = document.createElement("span"); label.textContent = clinic.doctor;
      marker.bindTooltip(label, { direction: "top" });
      marker.on("click", () => {
        const entry = markers.current.get(clinic.id);
        if (!entry) return;
        latest.current.onSelect(entry.clinic);
        map.current?.panTo(marker.getLatLng(), { animate: !reducedMotion(), duration: 0.4 });
      });
      markers.current.set(clinic.id, { marker, clinic }); additions.push(marker); geometryChanged = true;
    });
    cluster.addLayers(additions);
    if (geometryChanged) fit(false);
  }, [clinics, ready]);

  const previousSelection = useRef<string | null | undefined>(null);
  useEffect(() => {
    const L = engine.current;
    if (!L || !ready) return;
    const previous = previousSelection.current ? markers.current.get(previousSelection.current) : undefined;
    const next = selectedId ? markers.current.get(selectedId) : undefined;
    if (previous) { previous.marker.setIcon(pinIcon(L, previous.clinic, false)); previous.marker.setZIndexOffset(0); }
    if (next) { next.marker.setIcon(pinIcon(L, next.clinic, true)); next.marker.setZIndexOffset(1000); }
    previousSelection.current = selectedId;
  }, [selectedId, ready]);

  useEffect(() => {
    if (!ready) return;
    patient.current?.setLatLng(center);
  }, [center.lat, center.lng, ready]);

  const locate = () => {
    if (!navigator.geolocation) { setGpsError("تحديد الموقع غير متاح؛ اختر منشأة على الخريطة."); return; }
    setLocating(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude };
      patient.current?.setLatLng(point);
      map.current?.setView(point, 14, { animate: !reducedMotion() });
      setLocating(false);
    }, () => { setLocating(false); setGpsError("تعذّر تحديد موقعك. اسمح بالوصول للموقع ثم حاول مجدداً."); }, { timeout: 8000, maximumAge: 60000 });
  };

  return (
    <div ref={ref} className={cn("relative isolate", className)} {...props}>
      <div ref={container} className={cn("w-full", size === "compact" ? "h-80" : "h-[60vh] min-h-80")} dir="ltr" aria-label="خريطة العيادات والمستشفيات" />
      {!ready && <div className="absolute inset-0 grid place-items-center bg-card text-sm text-muted-foreground" role="status">{error ? "تعذّر تحميل الخريطة. أعد تحميل الصفحة." : "جاري تحميل الخريطة…"}</div>}
      <div className="absolute left-2 top-2 z-[500] flex flex-col gap-1.5" dir="ltr">
        <button type="button" className="sanad-map-control" aria-label="تكبير الخريطة" title="تكبير" onClick={() => map.current?.zoomIn()}><Plus /></button>
        <button type="button" className="sanad-map-control" aria-label="تصغير الخريطة" title="تصغير" onClick={() => map.current?.zoomOut()}><Minus /></button>
        <button type="button" className="sanad-map-control" aria-label="عرض كل المنشآت" title="عرض كل المنشآت" onClick={() => fit()}><Maximize /></button>
        <button type="button" className="sanad-map-control" aria-label="موقعي الحالي" title="موقعي الحالي" disabled={locating} onClick={locate}><LocateFixed className={locating ? "animate-pulse" : ""} /></button>
      </div>
      {gpsError && <p role="status" className="absolute inset-x-3 bottom-8 z-[500] rounded-md bg-card p-3 text-xs text-foreground shadow-soft">{gpsError}</p>}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="absolute bottom-1 right-2 z-[500] rounded-sm bg-card/90 px-1 text-[10px] text-muted-foreground" dir="ltr">© OpenStreetMap</a>
    </div>
  );
});
