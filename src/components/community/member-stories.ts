import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/media-upload";
import type { StoryItem } from "@/lib/stories";
import { signImages } from "./community-api";

export type MemberStoryGroup = {
  authorId: string;
  authorName: string;
  items: StoryItem[];
  allViewed: boolean;
};

const SEEN_KEY = "sanad_member_story_seen_v1";

function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Live (24h) member stories grouped by author, own group first. */
export async function fetchMemberStories(myId: string | null): Promise<MemberStoryGroup[]> {
  if (!myId) return [];
  const { data, error } = await supabase
    .from("member_stories")
    .select("id, author_id, author_name, image_path, caption, bg_style, font_style, created_at")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(200);
  if (error || !data) return [];
  const urls = await signImages(data.map((s) => s.image_path));
  const seen = seenSet();
  const groups = new Map<string, MemberStoryGroup>();
  for (const s of data) {
    const g = groups.get(s.author_id) ?? {
      authorId: s.author_id,
      authorName: s.author_name || "عضو",
      items: [],
      allViewed: true,
    };
    const url = s.image_path ? urls[s.image_path] ?? "" : "";
    g.items.push({
      id: s.id,
      url,
      mediaType: "image",
      caption: s.caption,
      kind: "story",
      highlightId: null,
      createdAt: s.created_at,
      tag: url ? undefined : `card:${s.bg_style}:${s.font_style}`,
    });
    if (!seen.has(s.id)) g.allViewed = false;
    groups.set(s.author_id, g);
  }
  return [...groups.values()].sort((a, b) =>
    a.authorId === myId ? -1 : b.authorId === myId ? 1 : Number(a.allViewed) - Number(b.allViewed),
  );
}

export async function markMemberStoryViewed(storyId: string, viewerId: string, viewerName: string) {
  const seen = seenSet();
  if (seen.has(storyId)) return;
  seen.add(storyId);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    /* ignore */
  }
  await supabase
    .from("member_story_views")
    .insert({ story_id: storyId, viewer_id: viewerId, viewer_name: viewerName });
}

export async function fetchStoryViewers(storyId: string) {
  const { data } = await supabase
    .from("member_story_views")
    .select("viewer_id, viewer_name, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function addMemberStory(input: {
  userId: string;
  userName: string;
  caption: string;
  bg: string;
  font: string;
  file: File | null;
}) {
  let image_path = "";
  if (input.file) {
    const small = await compressImage(input.file, 1440, 0.8);
    const ext = small.name.split(".").pop() || "jpg";
    image_path = `${input.userId}/stories/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("community")
      .upload(image_path, small, { contentType: small.type });
    if (error) throw error;
  }
  const { error } = await supabase.from("member_stories").insert({
    author_id: input.userId,
    author_name: input.userName,
    caption: input.caption.trim().slice(0, 280),
    bg_style: input.bg,
    font_style: input.font,
    image_path,
  });
  if (error) throw error;
}

export async function deleteMemberStory(id: string) {
  const { error } = await supabase.from("member_stories").delete().eq("id", id);
  if (error) throw error;
}
