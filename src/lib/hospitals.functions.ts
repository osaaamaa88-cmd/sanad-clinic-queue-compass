import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Hospital = Database["public"]["Tables"]["governmental_hospitals"]["Row"];

export const listHospitals = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("governmental_hospitals")
    .select("*")
    .order("governorate")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Hospital[];
});

export const getHospital = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const sb = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await sb.from("governmental_hospitals").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as Hospital | null;
  });

export const HOSPITAL_TYPES: Record<string, string> = {
  university: "جامعي",
  moh: "وزارة الصحة",
  teaching: "تعليمي",
  health_insurance: "تأمين صحي",
  specialized: "تخصصي",
};

export function hospitalMapsUrl(h: Pick<Hospital, "name" | "governorate" | "lat" | "lng" | "location_verified">) {
  return h.location_verified
    ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.name} ${h.governorate}`)}`;
}
