import { createServerFn } from "@tanstack/react-start";
import { isAdminRequest } from "./admin-auth.server";

export type ModerationRow = {
  postId: string | null;
  commentId: string | null;
  reporterCount: number;
  reasons: string[];
  hiddenAt: string | null;
  excerpt: string;
  author: string;
};

const AUTO_HIDE_THRESHOLD = 3;

/** Admin-only moderation queue: reports grouped per post/comment. */
export const godListReports = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ rows: ModerationRow[]; threshold: number }> => {
    if (!(await isAdminRequest())) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reports } = await supabaseAdmin
      .from("community_reports")
      .select("post_id, comment_id, reason, reporter_id, created_at")
      .order("created_at", { ascending: false });
    const seen = new Set<string>();
    const grouped = new Map<string, ModerationRow>();
    for (const r of reports ?? []) {
      const key = r.post_id ? `p:${r.post_id}` : `c:${r.comment_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          postId: r.post_id ?? null,
          commentId: r.comment_id ?? null,
          reporterCount: 0,
          reasons: [],
          hiddenAt: null,
          excerpt: "",
          author: "",
        });
      }
      const row = grouped.get(key)!;
      row.reporterCount += 1;
      if (!row.reasons.includes(r.reason)) row.reasons.push(r.reason);
      seen.add(key);
    }

    const postIds = [...grouped.keys()].filter((k) => k.startsWith("p:")).map((k) => k.slice(2));
    const commentIds = [...grouped.keys()].filter((k) => k.startsWith("c:")).map((k) => k.slice(2));

    const posts = postIds.length
      ? await supabaseAdmin.from("community_posts").select("id, body, author_id").in("id", postIds)
      : { data: [] };
    const comments = commentIds.length
      ? await supabaseAdmin
          .from("community_comments")
          .select("id, body, author_id")
          .in("id", commentIds)
      : { data: [] };

    for (const p of posts.data ?? []) {
      const row = grouped.get(`p:${p.id}`);
      if (row) {
        row.excerpt = String(p.body ?? "").slice(0, 120);
        row.author = String(p.author_id ?? "");
      }
    }
    for (const c of comments.data ?? []) {
      const row = grouped.get(`c:${c.id}`);
      if (row) {
        row.excerpt = String(c.body ?? "").slice(0, 120);
        row.author = String(c.author_id ?? "");
      }
    }

    return { rows: [...grouped.values()], threshold: AUTO_HIDE_THRESHOLD };
  },
);

/** Admin moderation action on a reported post or comment. */
export const godModerateContent = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      postId?: string;
      commentId?: string;
      action: "hide" | "restore" | "delete" | "reject";
    }) => d,
  )
  .handler(async ({ data }) => {
    if (!(await isAdminRequest())) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.postId) {
      if (data.action === "delete") {
        await supabaseAdmin.from("community_posts").delete().eq("id", data.postId);
      } else {
        const hidden = data.action === "hide";
        const { error } = await supabaseAdmin
          .from("community_posts")
          .update({ is_hidden: hidden } as never)
          .eq("id", data.postId);
        if (error) throw new Error(error.message);
      }
    } else if (data.commentId) {
      if (data.action === "delete") {
        await supabaseAdmin.from("community_comments").delete().eq("id", data.commentId);
      } else {
        const hidden = data.action === "hide";
        const { error } = await supabaseAdmin
          .from("community_comments")
          .update({ is_hidden: hidden } as never)
          .eq("id", data.commentId);
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true as const };
  });
