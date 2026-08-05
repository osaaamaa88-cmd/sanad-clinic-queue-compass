import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "clinic-media";
const SIGN_TTL = 60 * 60 * 24 * 7; // 7 days, so shared link previews keep working

type CommentRow = {
  id: string;
  author_name: string;
  author_key: string;
  body: string;
  is_clinic_reply: boolean;
  created_at: string;
};

function mapComments(rows: CommentRow[] | null, viewerKey: string) {
  return (rows ?? []).map((c) => ({
    id: c.id,
    name: c.author_name || (c.is_clinic_reply ? "العيادة" : "مريض"),
    body: c.body,
    isClinicReply: c.is_clinic_reply,
    isMine: Boolean(viewerKey) && c.author_key === viewerKey,
    createdAt: c.created_at,
  }));
}

export type PostComment = ReturnType<typeof mapComments>[number];

/** Public: one post with its media, likes and comments (used by the reels viewer + deep link). */
export const svrGetPost = createServerFn({ method: "POST" })
  .inputValidator((data: { postId: string; viewerKey?: string }) => {
    if (!data || typeof data.postId !== "string") throw new Error("Invalid input");
    return { postId: data.postId, viewerKey: String(data.viewerKey ?? "").slice(0, 80) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: post } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, clinic_id, media_url, media_type, caption, created_at")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) return null;

    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("id, doctor, specialty_id, area, avatar_url, is_verified, is_disabled")
      .eq("id", post.clinic_id)
      .maybeSingle();
    if (!clinic || clinic.is_disabled) return null;

    const paths = [post.media_url, ...(clinic.avatar_url ? [clinic.avatar_url] : [])];
    const { data: signed } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL);
    const map = new Map<string, string>();
    for (const s of signed ?? []) if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);

    const { count: likes } = await supabaseAdmin
      .from("clinic_post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", post.id);

    let liked = false;
    if (data.viewerKey) {
      const { data: row } = await supabaseAdmin
        .from("clinic_post_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("liker_key", data.viewerKey)
        .maybeSingle();
      liked = Boolean(row);
    }

    const { data: comments } = await supabaseAdmin
      .from("clinic_post_comments")
      .select("id, author_name, author_key, body, is_clinic_reply, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(200);

    return {
      id: post.id,
      clinicId: post.clinic_id,
      url: map.get(post.media_url) ?? "",
      mediaType: post.media_type === "video" ? ("video" as const) : ("image" as const),
      caption: post.caption ?? "",
      createdAt: post.created_at,
      doctor: clinic.doctor,
      specialtyId: clinic.specialty_id,
      area: clinic.area ?? "",
      avatarUrl: clinic.avatar_url ? (map.get(clinic.avatar_url) ?? "") : "",
      isVerified: Boolean(clinic.is_verified),
      likes: likes ?? 0,
      liked,
      comments: mapComments(comments as CommentRow[] | null, data.viewerKey),
    };
  });

/** Public: like counters (and whether this viewer liked) for a batch of posts. */
export const svrPostsSocialCounts = createServerFn({ method: "POST" })
  .inputValidator((data: { postIds: string[]; viewerKey?: string }) => {
    const ids = Array.isArray(data?.postIds) ? data.postIds.filter((i) => typeof i === "string").slice(0, 80) : [];
    return { postIds: ids, viewerKey: String(data?.viewerKey ?? "").slice(0, 80) };
  })
  .handler(async ({ data }) => {
    if (!data.postIds.length) return { likes: {} as Record<string, number>, liked: {} as Record<string, boolean>, comments: {} as Record<string, number> };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
      supabaseAdmin.from("clinic_post_likes").select("post_id, liker_key").in("post_id", data.postIds),
      supabaseAdmin.from("clinic_post_comments").select("post_id").in("post_id", data.postIds),
    ]);
    const likes: Record<string, number> = {};
    const liked: Record<string, boolean> = {};
    const comments: Record<string, number> = {};
    for (const r of likeRows ?? []) {
      likes[r.post_id] = (likes[r.post_id] ?? 0) + 1;
      if (data.viewerKey && r.liker_key === data.viewerKey) liked[r.post_id] = true;
    }
    for (const r of commentRows ?? []) comments[r.post_id] = (comments[r.post_id] ?? 0) + 1;
    return { likes, liked, comments };
  });

/** Public: like / unlike a post with the device viewer key. */
export const svrTogglePostLike = createServerFn({ method: "POST" })
  .inputValidator((data: { postId: string; viewerKey: string; like: boolean }) => {
    if (!data || typeof data.postId !== "string") throw new Error("Invalid input");
    const key = String(data.viewerKey ?? "").slice(0, 80);
    if (!key) throw new Error("Invalid input");
    return { postId: data.postId, viewerKey: key, like: Boolean(data.like) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.like) {
      const { error } = await supabaseAdmin
        .from("clinic_post_likes")
        .upsert({ post_id: data.postId, liker_key: data.viewerKey }, { onConflict: "post_id,liker_key" });
      if (error) {
        console.error("[svrTogglePostLike]", error.message);
        throw new Error("LIKE_FAILED");
      }
    } else {
      await supabaseAdmin
        .from("clinic_post_likes")
        .delete()
        .eq("post_id", data.postId)
        .eq("liker_key", data.viewerKey);
    }
    const { count } = await supabaseAdmin
      .from("clinic_post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", data.postId);
    return { liked: data.like, likes: count ?? 0 };
  });

/** Public: a patient adds a comment / question under a post. */
export const svrAddPostComment = createServerFn({ method: "POST" })
  .inputValidator((data: { postId: string; viewerKey: string; name?: string; body: string }) => {
    if (!data || typeof data.postId !== "string") throw new Error("Invalid input");
    const key = String(data.viewerKey ?? "").slice(0, 80);
    const body = String(data.body ?? "").trim().slice(0, 500);
    if (!key || !body) throw new Error("Invalid input");
    return { postId: data.postId, viewerKey: key, name: String(data.name ?? "").trim().slice(0, 60), body };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, clinic_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("COMMENT_FAILED");
    const { error } = await supabaseAdmin.from("clinic_post_comments").insert({
      post_id: post.id,
      clinic_id: post.clinic_id,
      author_key: data.viewerKey,
      author_name: data.name,
      body: data.body,
      is_clinic_reply: false,
    });
    if (error) {
      console.error("[svrAddPostComment]", error.message);
      throw new Error("COMMENT_FAILED");
    }
    const { data: comments } = await supabaseAdmin
      .from("clinic_post_comments")
      .select("id, author_name, author_key, body, is_clinic_reply, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(200);
    return { comments: mapComments(comments as CommentRow[] | null, data.viewerKey) };
  });

/** Doctor/secretary: reply to a patient comment on their own clinic post. */
export const svrAddClinicReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { postId: string; body: string; viewerKey?: string }) => {
    if (!data || typeof data.postId !== "string") throw new Error("Invalid input");
    const body = String(data.body ?? "").trim().slice(0, 500);
    if (!body) throw new Error("Invalid input");
    return { postId: data.postId, body, viewerKey: String(data.viewerKey ?? "").slice(0, 80) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: post } = await supabaseAdmin
      .from("clinic_posts")
      .select("id, clinic_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, post.clinic_id, context.userId);
    const { data: clinic } = await supabaseAdmin
      .from("clinics")
      .select("doctor")
      .eq("id", post.clinic_id)
      .maybeSingle();
    const { error } = await supabaseAdmin.from("clinic_post_comments").insert({
      post_id: post.id,
      clinic_id: post.clinic_id,
      author_key: `staff:${context.userId}`,
      author_name: clinic?.doctor ?? "العيادة",
      body: data.body,
      is_clinic_reply: true,
    });
    if (error) {
      console.error("[svrAddClinicReply]", error.message);
      throw new Error("COMMENT_FAILED");
    }
    const { data: comments } = await supabaseAdmin
      .from("clinic_post_comments")
      .select("id, author_name, author_key, body, is_clinic_reply, created_at")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .limit(200);
    return { comments: mapComments(comments as CommentRow[] | null, data.viewerKey) };
  });

/** Doctor/secretary: remove any comment under their own clinic post. */
export const svrDeletePostComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { commentId: string; viewerKey?: string }) => {
    if (!data || typeof data.commentId !== "string") throw new Error("Invalid input");
    return { commentId: data.commentId, viewerKey: String(data.viewerKey ?? "").slice(0, 80) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertClinicManager } = await import("@/lib/clinic-access.server");
    const { data: row } = await supabaseAdmin
      .from("clinic_post_comments")
      .select("id, post_id, clinic_id")
      .eq("id", data.commentId)
      .maybeSingle();
    if (!row) throw new Error("FORBIDDEN");
    await assertClinicManager(supabaseAdmin, row.clinic_id, context.userId);
    await supabaseAdmin.from("clinic_post_comments").delete().eq("id", data.commentId);
    const { data: comments } = await supabaseAdmin
      .from("clinic_post_comments")
      .select("id, author_name, author_key, body, is_clinic_reply, created_at")
      .eq("post_id", row.post_id)
      .order("created_at", { ascending: true })
      .limit(200);
    return { comments: mapComments(comments as CommentRow[] | null, data.viewerKey) };
  });
