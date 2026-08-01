import { useEffect, useRef } from "react";
import type { Clinic } from "@/lib/mock-data";
import { getSpecialty } from "@/lib/mock-data";

type LeafletMap = { remove: () => void; setView: (c: [number, number], z?: number) => void };

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
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<{ clearLayers: () => void } | null>(null);

  // Create the map once, on the client only.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);
      const group: import("leaflet").LayerGroup = L.layerGroup().addTo(map);
      mapRef.current = map as unknown as LeafletMap;
      layerRef.current = group as unknown as { clearLayers: () => void };
      // Patient location marker
      L.marker([center.lat, center.lng], {
        icon: L.divIcon({
          className: "",
          html: `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:9999px;background:#06B6D4;border:3px solid #0F172A;box-shadow:0 0 0 6px rgba(6,182,212,.25)"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      }).addTo(map);
      renderPins(L, group);
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render pins when the clinic list or selection changes.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const group = layerRef.current;
      if (!group) return;
      renderPins(L, group as unknown as import("leaflet").LayerGroup);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics, selectedId]);

  function renderPins(L: typeof import("leaflet"), group: import("leaflet").LayerGroup) {
    group.clearLayers();
    clinics.forEach((c) => {
      if (!c.lat || !c.lng) return;
      const spec = getSpecialty(c.specialtyId);
      const active = selectedId === c.id;
      const marker = L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:9999px;font-family:Tajawal,sans-serif;font-weight:800;font-size:12px;color:#0F172A;background:${
            active ? "#06B6D4" : "#ffffff"
          };border:2px solid ${active ? "#ffffff" : "#06B6D4"};box-shadow:0 4px 12px rgba(0,0,0,.35);white-space:nowrap">
            <span>${spec?.emoji ?? "🩺"}</span><span>${c.price ? `${c.price} ج` : "كشف"}</span>
          </div>`,
          iconSize: [70, 28],
          iconAnchor: [35, 14],
        }),
      });
      marker.on("click", () => onSelect(c));
      marker.addTo(group);
    });
  }

  return <div ref={containerRef} className="h-[60vh] w-full" dir="ltr" />;
}