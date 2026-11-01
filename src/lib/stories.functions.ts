import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "clinic-media";

/** Public: active (24h) stories + pinned highlights of a clinic, with signed media URLs. */
export const svrGetClinicStories = createServerFn({ method: "POST" })
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, is_disabled")
      .eq("id", data.clinicId)
      .maybeSingle();
    if (!clinic || clinic.is_disabled) return { stories: [], highlights: [] };

    const { data: highlights } = await supabaseAdmin
      .from("clinic_highlights")
      .select("id, title, emoji, sort_order")
      .eq("clinic_id", data.clinicId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const { data: rows } = await supabaseAdmin
      .from("clinic_stories")
      .select(
        "id, media_url, media_type, caption, kind, tag, views_count, highlight_id, expires_at, is_pinned, created_at",
      )
      .eq("clinic_id", data.clinicId)
      .order("created_at", { ascending: false })
      .limit(120);

    const all = rows ?? [];
    const paths = all.map((s) => s.media_url).filter((p) => !!p);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrls(paths, 60 * 60 * 6);
      for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }

    const map = (s: (typeof all)[number]) => ({
      id: s.id,
      url: s.media_url ? (signed.get(s.media_url) ?? "") : "",
      mediaType: s.media_type === "video" ? ("video" as const) : ("image" as const),
      caption: s.caption ?? "",
      kind: s.kind === "urgent" ? ("urgent" as const) : ("story" as const),
      highlightId: s.highlight_id ?? null,
      createdAt: s.created_at,
      tag: s.tag ?? "",
      views: s.views_count ?? 0,
    });

    const now = Date.now();
    const active = all
      .filter((s) => !s.highlight_id && new Date(s.expires_at).getTime() > now)
      .map(map)
      .reverse();

    return {
      stories: active,
      highlights: (highlights ?? []).map((h) => ({
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        items: all
          .filter((s) => s.highlight_id === h.id)
          .map(map)
          .reverse(),
      })),
    };
  });

/** Clinic staff: publish a story (media or urgent text), optionally pinned to a highlight. */
export const svrAddStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      clinicId: string;
      kind?: "story" | "urgent";
      caption?: string;
      highlightId?: string | null;
      fileName?: string;
      contentType?: string;
      base64?: string;
      durationHours?: number;
      cardStyle?: string;
    }) => {
      if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
      const base64 = String(data.base64 ?? "");
      if (base64 && base64.length > 9_000_000) throw new Error("FILE_TOO_LARGE");
      const contentType = String(data.contentType ?? "");
      if (base64 && !/^(image|video)\//.test(contentType)) throw new Error("INVALID_TYPE");
      const caption = String(data.caption ?? "").slice(0, 300);
      if (!base64 && !caption) throw new Error("Invalid input");
      return {
        clinicId: data.clinicId,
        kind: data.kind === "urgent" ? ("urgent" as const) : ("story" as const),
        caption,
        highlightId:
          typeof data.highlightId === "string" && data.highlightId ? data.highlightId : null,
        fileName: String(data.fileName ?? "story")
          .slice(-60)
          .replace(/[^a-zA-Z0-9._-]/g, "_"),
        contentType,
        base64,
        durationHours: data.durationHours === 12 ? 12 : 24,
        cardStyle:
          /^card:(navy|ocean|emerald|gold|rose|lavender|sunset|night):(alexandria|kufi|ruqaa|lalezar|amiri|marhey)$/.test(
            String(data.cardStyle ?? ""),
          ) && !base64
            ? String(data.cardStyle)
            : "",
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);

    let path = "";
    if (data.base64) {
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      path = `${data.clinicId}/story/${Date.now()}-${data.fileName}`;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: data.contentType, upsert: true });
      if (error) {
        console.error("[svrAddStory] upload", error.message);
        throw new Error("UPLOAD_FAILED");
      }
    }

    const { error } = await supabaseAdmin.from("clinic_stories").insert({
      clinic_id: data.clinicId,
      highlight_id: data.highlightId,
      expires_at: new Date(
        Date.now() + (data.highlightId ? 3650 * 864e5 : data.durationHours * 36e5),
      ).toISOString(),
      media_url: path,
      media_type: data.contentType.startsWith("video/") ? "video" : "image",
      caption: data.caption,
      kind: data.kind,
      ...(data.cardStyle ? { tag: data.cardStyle } : {}),
      is_pinned: Boolean(data.highlightId),
    });
    if (error) {
      console.error("[svrAddStory] insert", error.message);
      throw new Error("CREATE_FAILED");
    }
    return { ok: true as const };
  });

/** Clinic staff: delete one story. */
export const svrDeleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { storyId: string }) => {
    if (!data || typeof data.storyId !== "string") throw new Error("Invalid input");
    return { storyId: data.storyId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: story } = await supabaseAdmin
      .from("clinic_stories")
      .select("id, clinic_id, media_url")
      .eq("id", data.storyId)
      .maybeSingle();
    if (!story) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, story.clinic_id, context.userId);
    if (story.media_url) await supabaseAdmin.storage.from(BUCKET).remove([story.media_url]);
    await supabaseAdmin.from("clinic_stories").delete().eq("id", data.storyId);
    return { ok: true as const };
  });

/** Clinic staff: create a pinned highlight category. */
export const svrCreateHighlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string; title: string; emoji?: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    const title = String(data.title ?? "")
      .trim()
      .slice(0, 40);
    if (!title) throw new Error("Invalid input");
    return { clinicId: data.clinicId, title, emoji: String(data.emoji ?? "✨").slice(0, 8) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("clinic_highlights")
      .insert({ clinic_id: data.clinicId, title: data.title, emoji: data.emoji })
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[svrCreateHighlight]", error.message);
      throw new Error("CREATE_FAILED");
    }
    return { ok: true as const, id: row?.id ?? "" };
  });

/** Clinic staff: remove a highlight (its stories stay as normal stories). */
export const svrDeleteHighlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { highlightId: string }) => {
    if (!data || typeof data.highlightId !== "string") throw new Error("Invalid input");
    return { highlightId: data.highlightId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: h } = await supabaseAdmin
      .from("clinic_highlights")
      .select("id, clinic_id")
      .eq("id", data.highlightId)
      .maybeSingle();
    if (!h) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, h.clinic_id, context.userId);
    await supabaseAdmin.from("clinic_highlights").delete().eq("id", data.highlightId);
    return { ok: true as const };
  });
/** Clinic staff: pin existing stories into a highlight (Instagram-style "add to highlight"). */
export const svrPinStories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { highlightId: string; storyIds: string[] }) => {
    if (!data || typeof data.highlightId !== "string" || !Array.isArray(data.storyIds))
      throw new Error("Invalid input");
    const storyIds = data.storyIds.filter((s) => typeof s === "string").slice(0, 50);
    if (!storyIds.length) throw new Error("Invalid input");
    return { highlightId: data.highlightId, storyIds };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: h } = await supabaseAdmin
      .from("clinic_highlights")
      .select("id, clinic_id")
      .eq("id", data.highlightId)
      .maybeSingle();
    if (!h) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, h.clinic_id, context.userId);
    const { error } = await supabaseAdmin
      .from("clinic_stories")
      .update({ highlight_id: h.id, is_pinned: true })
      .in("id", data.storyIds)
      .eq("clinic_id", h.clinic_id);
    if (error) throw new Error("PIN_FAILED");
    return { ok: true as const };
  });

/** Clinic staff: remove the clinic avatar (falls back to the specialty icon). */
export const svrRemoveClinicAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { clinicId: string }) => {
    if (!data || typeof data.clinicId !== "string") throw new Error("Invalid input");
    return { clinicId: data.clinicId };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    await assertClinicManager(supabaseAdmin, data.clinicId, context.userId);
    const { error } = await supabaseAdmin
      .from("clinics")
      .update({ avatar_url: "" })
      .eq("id", data.clinicId);
    if (error) throw new Error("REMOVE_FAILED");
    return { ok: true as const };
  });

/** Public: count one view of a story (best effort). */
export const svrViewStory = createServerFn({ method: "POST" })
  .inputValidator((data: { storyId: string }) => {
    if (!data || typeof data.storyId !== "string" || !/^[0-9a-f-]{36}$/i.test(data.storyId))
      throw new Error("Invalid input");
    return { storyId: data.storyId };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertRateLimit, clientIp } = await import("@/lib/rate-limit.server");
    await assertRateLimit(`story-view:${data.storyId}:${await clientIp()}`, 1, 60);
    const { data: row } = await supabaseAdmin
      .from("clinic_stories")
      .select("views_count")
      .eq("id", data.storyId)
      .maybeSingle();
    if (row)
      await supabaseAdmin
        .from("clinic_stories")
        .update({ views_count: (row.views_count ?? 0) + 1 })
        .eq("id", data.storyId);
    return { ok: true as const };
  });
