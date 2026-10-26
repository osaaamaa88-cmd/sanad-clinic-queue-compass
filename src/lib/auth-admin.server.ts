import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function patchUserAppMetadata(
  admin: SupabaseClient<Database>,
  userId: string,
  patch: Record<string, string>,
): Promise<void> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("USER_NOT_FOUND");

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, ...patch },
  });
  if (updateError) throw new Error(updateError.message);
}
