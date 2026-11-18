import { supabase } from "@/integrations/supabase/client";
import {
  FEED_PAGE_SIZE,
  type AnsweredFilter,
  type FeedCursor,
  type FeedPost,
  type FeedTab,
  type TopDoctorComment,
} from "./community-logic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Narrows one untyped RPC row to a FeedPost. The RPC returns JSON, so every
 * field is read defensively instead of casting the whole page.
 */
function toFeedPost(row: unknown): FeedPost {
  const r: Record<string, unknown> = isRecord(row) ? row : {};
  const str = (key: string): string => {
    const v = r[key];
    return typeof v === "string" ? v : "";
  };
  const nullableStr = (key: string): string | null => {
    const v = r[key];
    return typeof v === "string" ? v : null;
  };
  const top = isRecord(r.top_doctor_comment)
    ? ({
        id: typeof r.top_doctor_comment.id === "string" ? r.top_doctor_comment.id : "",
        author_name:
          typeof r.top_doctor_comment.author_name === "string"
            ? r.top_doctor_comment.author_name
            : "",
        clinic_id:
          typeof r.top_doctor_comment.clinic_id === "string" ? r.top_doctor_comment.clinic_id : "",
        avatar_url:
          typeof r.top_doctor_comment.avatar_url === "string"
            ? r.top_doctor_comment.avatar_url
            : "",
        body: typeof r.top_doctor_comment.body === "string" ? r.top_doctor_comment.body : "",
        created_at:
          typeof r.top_doctor_comment.created_at === "string"
            ? r.top_doctor_comment.created_at
            : "",
      } satisfies TopDoctorComment)
    : null;
  return {
    id: str("id"),
    author_name: str("author_name"),
    is_anonymous: r.is_anonymous === true,
    is_mine: r.is_mine === true,
    clinic_id: nullableStr("clinic_id"),
    doctor_name: nullableStr("doctor_name"),
    doctor_avatar: nullableStr("doctor_avatar"),
    kind: str("kind"),
    body: str("body"),
    bg_style: str("bg_style"),
    font_style: str("font_style"),
    image_path: str("image_path"),
    specialty_id: str("specialty_id"),
    created_at: str("created_at"),
    likes_count: Number(r.likes_count) || 0,
    comments_count: Number(r.comments_count) || 0,
    my_liked: r.my_liked === true,
    my_saved: r.my_saved === true,
    answered_by_doctor: r.answered_by_doctor === true,
    top_doctor_comment: top,
  };
}

export type FeedParams = {
  tab: FeedTab;
  specialty: string;
  answered: AnsweredFilter;
  followerKey: string;
  search?: string;
};

export async function fetchFeedPage(params: FeedParams, cursor: FeedCursor): Promise<FeedPost[]> {
  const { data, error } = await supabase.rpc("community_feed_page", {
    p_limit: FEED_PAGE_SIZE,
    ...(cursor ? { p_cursor_created_at: cursor.created_at, p_cursor_id: cursor.id } : {}),
    p_tab: params.tab,
    ...(params.specialty ? { p_specialty: params.specialty } : {}),
    ...(params.followerKey ? { p_follower_key: params.followerKey } : {}),
    p_answered: params.tab === "questions" ? params.answered : "all",
    ...(params.search ? { p_search: params.search } : {}),
  });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map(toFeedPost);
}

/** Signed image URLs cached ~50 minutes (they are issued for 60). */
const imageCache = new Map<string, { url: string; exp: number }>();
export async function signImages(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of new Set(paths.filter(Boolean))) {
    const hit = imageCache.get(p);
    if (hit && hit.exp > now) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await supabase.storage.from("community").createSignedUrls(missing, 3600);
    for (const s of data ?? []) {
      if (!s.signedUrl || !s.path) continue;
      imageCache.set(s.path, { url: s.signedUrl, exp: now + 50 * 60 * 1000 });
      out[s.path] = s.signedUrl;
    }
  }
  return out;
}

export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  clinic_id: string | null;
  body: string;
  created_at: string;
  parent_id: string | null;
  is_doctor: boolean;
  doctor_name: string;
};

export const COMMENTS_PAGE = 20;

export async function fetchComments(postId: string, page: number): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from("community_comments")
    .select("id, post_id, author_id, author_name, clinic_id, body, created_at, parent_id")
    .eq("post_id", postId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .range(page * COMMENTS_PAGE, page * COMMENTS_PAGE + COMMENTS_PAGE - 1);
  if (error) throw error;
  const top = data ?? [];
  const { data: replies } = top.length
    ? await supabase
        .from("community_comments")
        .select("id, post_id, author_id, author_name, clinic_id, body, created_at, parent_id")
        .in(
          "parent_id",
          top.map((t) => t.id),
        )
        .order("created_at", { ascending: true })
    : { data: [] };
  const rows = [...top, ...(replies ?? [])];
  const ids = [...new Set(rows.map((r) => r.clinic_id).filter(Boolean) as string[])];
  const clinics: Record<string, { doctor: string; is_verified: boolean }> = {};
  if (ids.length) {
    const { data: cl } = await supabase
      .from("clinics")
      .select("id, doctor, is_verified")
      .in("id", ids);
    for (const c of cl ?? []) clinics[c.id] = c;
  }
  return rows.map((r) => {
    const c = r.clinic_id ? clinics[r.clinic_id] : undefined;
    return { ...r, is_doctor: !!c?.is_verified, doctor_name: c?.doctor ?? "" };
  });
}

export async function setLiked(postId: string, userId: string, on: boolean) {
  const { error } = on
    ? await supabase.from("community_likes").insert({ post_id: postId, user_id: userId })
    : await supabase.from("community_likes").delete().eq("post_id", postId).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

export async function setSaved(postId: string, userId: string, on: boolean) {
  const { error } = on
    ? await supabase.from("community_saves").insert({ post_id: postId, user_id: userId })
    : await supabase.from("community_saves").delete().eq("post_id", postId).eq("user_id", userId);
  if (error && error.code !== "23505") throw error;
}

const HIDDEN_KEY = "sanad_community_hidden_v1";
export function getHiddenPosts(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
export function hidePostLocally(id: string) {
  const s = getHiddenPosts();
  s.add(id);
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s].slice(-300)));
}

const RECENT_KEY = "sanad_community_recent_search_v1";
export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
export function pushRecentSearch(q: string) {
  const list = [q, ...getRecentSearches().filter((x) => x !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export async function sharePost(id: string) {
  const url = `${window.location.origin}/community#post-${id}`;
  const { nativeShare } = await import("@/lib/native");
  const result = await nativeShare({ title: "مجتمع سند", url });
  if (result !== "copied") return;
  const { toast } = await import("sonner");
  toast.success("تم نسخ الرابط");
}
