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
