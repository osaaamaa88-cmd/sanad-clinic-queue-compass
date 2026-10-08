import { queryOptions } from "@tanstack/react-query";
import { getVerifiedClinics } from "@/lib/mock-data";
import { listHospitals } from "@/lib/hospitals.functions";

/** Directory data changes rarely; keep it fresh for an hour so screens open instantly from cache. */
export const DIRECTORY_STALE_MS = 60 * 60 * 1000;

export const clinicsQuery = queryOptions({
  queryKey: ["directory", "clinics"],
  queryFn: () => getVerifiedClinics(),
  staleTime: DIRECTORY_STALE_MS,
});

export const hospitalsQuery = queryOptions({
  queryKey: ["directory", "hospitals"],
  queryFn: () => listHospitals(),
  staleTime: DIRECTORY_STALE_MS,
});
