import type { SupabaseClient } from "@supabase/supabase-js";

/** Stored media refs: "avatars:<path>" lives in the avatars bucket; bare paths live in clinic-media. */
export const AVATAR_PREFIX = "avatars:";

export async function signMediaRefs(
  admin: SupabaseClient,
  refs: string[],
  ttl = 60 * 60 * 6,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const groups: Record<string, string[]> = { avatars: [], "clinic-media": [] };
  for (const r of new Set(refs.filter(Boolean))) {
    if (r.startsWith("http")) out.set(r, r);
    else if (r.startsWith(AVATAR_PREFIX)) groups.avatars.push(r.slice(AVATAR_PREFIX.length));
    else groups["clinic-media"].push(r);
  }
  for (const [bucket, paths] of Object.entries(groups)) {
    if (!paths.length) continue;
    const { data } = await admin.storage.from(bucket).createSignedUrls(paths, ttl);
    for (const s of data ?? []) {
      if (!s.path || !s.signedUrl) continue;
      out.set(bucket === "avatars" ? AVATAR_PREFIX + s.path : s.path, s.signedUrl);
    }
  }
  return out;
}
