import { createElement, useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocateFixed, Stethoscope } from "lucide-react";
import { specialtyIcons } from "@/lib/specialty-icons";
import type { Clinic } from "@/lib/mock-data";
import { getSpecialty } from "@/lib/mock-data";

type L_ = typeof import("leaflet");

export function ClinicsMap({
  clinics,
  center,
  selectedId,
  onSelect,
}: {
  clinics: Clinic[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
  onSelect: (c: Clinic) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const meRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<L_ | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 90,
        inertia: true,
        inertiaDeceleration: 2500,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true,
      });
      // Pre-rendered dark tiles: no per-tile CSS filters, so panning stays at 60fps on phones.
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        keepBuffer: 4,
        updateWhenZooming: false,
        detectRetina: false,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      meRef.current = L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "",
          html: `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:9999px;background:#06B6D4;border:3px solid #0F172A;box-shadow:0 0 0 6px rgba(6,182,212,.25)"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        zIndexOffset: 1000,
      }).addTo(map);
      renderPins(true);
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the patient dot in sync with the latest GPS position.
  useEffect(() => {
    meRef.current?.setLatLng([center.lat, center.lng]);
  }, [center.lat, center.lng]);

  // Rebuild pins only when the result set changes; selection just swaps two icons.
  const lastKey = useRef("");
  const markersRef = useRef<Map<string, { m: import("leaflet").Marker; c: Clinic }>>(new Map());
  const prevSel = useRef<string | null | undefined>(null);
  useEffect(() => {
    const key = clinics.map((c) => c.id).join(",");
    if (key !== lastKey.current) {
      lastKey.current = key;
      renderPins(true);
    } else {
      updateSelection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics, selectedId]);

  function iconFor(L: L_, c: Clinic, active: boolean) {
    if (c.kind === "hospital") {
      const approx = !!c.approxLocation;
      return L.divIcon({
        className: "",
        html: `<div style="display:grid;place-items:center;width:28px;height:28px;border-radius:9999px;font-size:14px;background:${active ? "#B91C1C" : "#DC2626"};border:2px ${approx ? "dashed #FBBF24" : "solid #fff"};box-shadow:0 4px 10px rgba(0,0,0,.35);transform:scale(${active ? 1.2 : 1})">🏥</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    }
    return L.divIcon({
      className: "",
      html: `<div style="display:flex;flex-direction:column;align-items:center">
        <div style="display:flex;align-items:center;gap:5px;padding:4px 9px 4px 5px;border-radius:9999px;font-family:Tajawal,sans-serif;font-weight:800;font-size:12px;color:${active ? "#0F172A" : "#F8FAFC"};background:${active ? "#06B6D4" : "#0F172A"};border:2px solid #06B6D4;box-shadow:0 6px 16px rgba(6,182,212,.35);white-space:nowrap">
        <span style="display:grid;place-items:center;width:20px;height:20px;border-radius:9999px;background:${active ? "#0F172A" : "#06B6D4"};color:${active ? "#06B6D4" : "#0F172A"}">${renderToStaticMarkup(createElement(specialtyIcons[c.specialtyId] ?? Stethoscope, { size: 13, strokeWidth: 2.5 }))}</span><span>${c.price ? `${c.price} ج` : "كشف"}</span>
        </div>
        <div style="width:2px;height:8px;background:#06B6D4"></div>
      </div>`,
      iconSize: [80, 38],
      iconAnchor: [40, 38],
    });
  }

  function updateSelection() {
    const L = LRef.current;
    if (!L) return;
    const base = (c: Clinic) => (c.kind === "hospital" ? -100 : 0);
    const prev = prevSel.current ? markersRef.current.get(prevSel.current) : undefined;
    if (prev) { prev.m.setIcon(iconFor(L, prev.c, false)); prev.m.setZIndexOffset(base(prev.c)); }
    const next = selectedId ? markersRef.current.get(selectedId) : undefined;
    if (next) { next.m.setIcon(iconFor(L, next.c, true)); next.m.setZIndexOffset(500); }
    prevSel.current = selectedId;
  }

  function renderPins(fit: boolean) {
    const L = LRef.current;
    const group = layerRef.current;
    const map = mapRef.current;
    if (!L || !group || !map) return;
    group.clearLayers();
    markersRef.current.clear();
    const pts: [number, number][] = [];
    clinics.forEach((c) => {
      if (!c.lat || !c.lng) return;
      pts.push([c.lat, c.lng]);
      const active = selectedId === c.id;
      const m = L.marker([c.lat, c.lng], { icon: iconFor(L, c, active), zIndexOffset: active ? 500 : c.kind === "hospital" ? -100 : 0 });
      if (c.kind === "hospital") m.bindTooltip(`${c.doctor ?? "مستشفى"}${c.approxLocation ? " · موقع تقريبي" : ""}`, { direction: "top", offset: [0, -14] });
      m.on("click", () => { onSelect(c); map.panTo([c.lat!, c.lng!], { animate: true, duration: 0.35 }); });
      m.addTo(group);
      markersRef.current.set(c.id, { m, c });
    });
    prevSel.current = selectedId;
    if (fit && pts.length) {
      map.fitBounds(L.latLngBounds([...pts, [center.lat, center.lng]]), { padding: [40, 40], maxZoom: 15, animate: true });
    }
  }

  const recenter = () => mapRef.current?.setView([center.lat, center.lng], 15);

  // InDrive-style street route (free OSRM, no API key) to the selected clinic.
  const routeRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ min: number; km: number } | null>(null);
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    routeRef.current?.remove();
    routeRef.current = null;
    setRouteInfo(null);
    const c = clinics.find((x) => x.id === selectedId);
    if (!L || !map || !c?.lat || !c?.lng) return;
    const ctrl = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${center.lng},${center.lat};${c.lng},${c.lat}?overview=full&geometries=geojson`;
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const r = d?.routes?.[0];
        if (!r) return;
        const pts = (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng] as [number, number]);
        const g = L.layerGroup([
          L.polyline(pts, { color: "#0F172A", weight: 9, opacity: 0.9 }),
          L.polyline(pts, { color: "#06B6D4", weight: 5, opacity: 1 }),
        ]).addTo(map);
        routeRef.current = g;
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 16 });
        setRouteInfo({ min: Math.max(1, Math.round(r.duration / 60)), km: Math.round(r.distance / 100) / 10 });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedId, center.lat, center.lng, clinics]);

  return (
    <div className="relative isolate">
      <div ref={containerRef} className="h-[60vh] w-full" dir="ltr" />
      {routeInfo && (
        <div className="absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-card px-4 py-2 text-sm font-extrabold shadow-soft ring-1 ring-primary">
          🚗 {routeInfo.min} دقيقة تقريباً • {routeInfo.km} كم
        </div>
      )}
      <span className="pointer-events-none absolute bottom-1 right-2 z-[500] text-[9px] text-muted-foreground" dir="ltr">© OpenStreetMap © CARTO</span>
      <button
        type="button"
        onClick={recenter}
        aria-label="موقعي الحالي"
        className="absolute bottom-4 left-4 z-[500] grid h-12 w-12 place-items-center rounded-full bg-card text-primary shadow-soft ring-1 ring-border"
      >
        <LocateFixed className="h-5 w-5" />
      </button>
    </div>
  );
}
