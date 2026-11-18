import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clinicsQuery, hospitalsQuery } from "@/lib/directory-queries";
import { hospitalToClinic } from "@/lib/hospital-adapter";
import { getSpecialty, type Clinic } from "@/lib/mock-data";
import { getPatientLocation, savePatientLocation, nearestArea } from "@/lib/patient-location";
import type { Hospital } from "@/lib/hospitals.functions";

export type ClinicSearchView = "list" | "map";
export type ClinicSearchSort = "nearest" | "price" | "reviews" | "rating";
export type ClinicSearchKind = "all" | "clinic" | "hospital";
export type LatLng = { lat: number; lng: number };

const DEFAULT_POS: LatLng = { lat: 30.0444, lng: 31.2357 };

/**
 * حالة صفحة البحث عن العيادات: جلب العيادات والمستشفيات، موقع المريض،
 * الفلاتر والترتيب، والعيادة المختارة على الخريطة.
 */
export function useClinicSearch() {
  const [view, setView] = useState<ClinicSearchView>("map");
  const [spec, setSpec] = useState<string | null>(null);
  const { data: clinics = [] } = useQuery(clinicsQuery);
  const { data: hospitals = [] } = useQuery({
    ...hospitalsQuery,
    select: (rows: Hospital[]) => rows,
  });
  const [kind, setKind] = useState<ClinicSearchKind>("all");
  const [pos, setPos] = useState<LatLng>(DEFAULT_POS);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ClinicSearchSort>("nearest");
  const [openNow, setOpenNow] = useState(false);
  const [selected, setSelected] = useState<Clinic | null>(null);

  const applyGpsPosition = useCallback((p: LatLng) => {
    setPos(p);
    const n = nearestArea(p.lat, p.lng);
    savePatientLocation({
      name: `بالقرب من ${n.name}`,
      city: n.city,
      lat: p.lat,
      lng: p.lng,
      gps: true,
    });
    setSort("nearest");
  }, []);

  useEffect(() => {
    const saved = getPatientLocation();
    setPos({ lat: saved.lat, lng: saved.lng });
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => applyGpsPosition({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 },
    );
  }, [applyGpsPosition]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const hosp = hospitals.map((h) => hospitalToClinic(h, pos));
    let list = kind === "clinic" ? clinics : kind === "hospital" ? hosp : [...clinics, ...hosp];
    if (spec) list = list.filter((c) => c.kind === "hospital" || c.specialtyId === spec);
    if (openNow) list = list.filter((c) => c.availableNow);
    if (term) {
      list = list.filter((c) => {
        const s = getSpecialty(c.specialtyId);
        return (
          c.doctor.toLowerCase().includes(term) ||
          c.area.toLowerCase().includes(term) ||
          c.address.toLowerCase().includes(term) ||
          (s?.name.toLowerCase().includes(term) ?? false)
        );
      });
    }
    const ranked = list.filter((clinic) => !clinic.isDemo);
    const demos = list.filter((clinic) => clinic.isDemo);
    if (sort === "price") ranked.sort((a, b) => a.price - b.price);
    else if (sort === "reviews") ranked.sort((a, b) => b.reviews - a.reviews);
    else if (sort === "rating") ranked.sort((a, b) => b.rating - a.rating);
    else ranked.sort((a, b) => a.distanceKm - b.distanceKm);
    return [...ranked, ...demos];
  }, [clinics, hospitals, pos, kind, spec, q, sort, openNow]);

  return {
    view,
    setView,
    spec,
    setSpec,
    kind,
    setKind,
    q,
    setQ,
    sort,
    setSort,
    openNow,
    setOpenNow,
    selected,
    setSelected,
    pos,
    applyGpsPosition,
    filtered,
  };
}
