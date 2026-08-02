import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Throws unless the signed-in user is the clinic owner (doctor) or clinic staff (secretary).
 * Patients can read queue numbers and book, but never mutate clinic operations.
 */
export async function assertClinicManager(
  admin: SupabaseClient<any, any, any>,
  clinicId: string,
  userId: string,
): Promise<void> {
  const { data: clinic } = await admin
    .from("clinics")
    .select("id, owner_id")
    .eq("id", clinicId)
    .maybeSingle();
  if (!clinic) throw new Error("FORBIDDEN");
  if (clinic.owner_id === userId) return;

  const { data: staff } = await admin
    .from("clinic_staff")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!staff) throw new Error("FORBIDDEN");
}
