import {
  svrGetPost,
  svrPostsSocialCounts,
  svrTogglePostLike,
  svrAddPostComment,
  svrAddClinicReply,
  svrDeletePostComment,
} from "@/lib/post-social.functions";
import { getFollowerKey } from "@/lib/clinic-profile";

export type PostComment = {
  id: string;
  name: string;
  body: string;
  isClinicReply: boolean;
  isMine: boolean;
  createdAt: string;
};

export type PostSocial = {
  likes: Record<string, number>;
  liked: Record<string, boolean>;
  comments: Record<string, number>;
};

/** Stable per-device key for likes and comments (same key used for follows). */
export function getViewerKey(): string {
  return getFollowerKey();
}

export function postShareUrl(postId: string): string {
  const origin = typeof window === "undefined" ? "https://tabeebak-egypt.lovable.app" : window.location.origin;
  return `${origin}/p/${postId}`;
}

export function clinicShareUrl(clinicId: string): string {
  const origin = typeof window === "undefined" ? "https://tabeebak-egypt.lovable.app" : window.location.origin;
  return `${origin}/patient/clinic/${clinicId}`;
}

/** Native share sheet with a WhatsApp fallback. */
export async function shareLink(opts: { title: string; text: string; url: string }): Promise<"shared" | "whatsapp" | "copied"> {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
      return "shared";
    } catch {
      /* user cancelled or unsupported — fall through */
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(`${opts.text}\n${opts.url}`);
      return "copied";
    } catch {
      /* ignore */
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${opts.text}\n${opts.url}`)}`, "_blank");
  return "whatsapp";
}

export async function loadPostsSocial(postIds: string[]): Promise<PostSocial> {
  try {
    return await svrPostsSocialCounts({ data: { postIds, viewerKey: getViewerKey() } });
  } catch {
    return { likes: {}, liked: {}, comments: {} };
  }
}

export async function getPost(postId: string) {
  try {
    return await svrGetPost({ data: { postId, viewerKey: getViewerKey() } });
  } catch {
    return null;
  }
}

export async function togglePostLike(postId: string, like: boolean) {
  try {
    return await svrTogglePostLike({ data: { postId, viewerKey: getViewerKey(), like } });
  } catch {
    return null;
  }
}

export async function addPostComment(postId: string, body: string, name: string) {
  try {
    const r = await svrAddPostComment({ data: { postId, viewerKey: getViewerKey(), body, name } });
    return r.comments as PostComment[];
  } catch {
    return null;
  }
}

export async function addClinicReply(postId: string, body: string) {
  try {
    const r = await svrAddClinicReply({ data: { postId, body, viewerKey: getViewerKey() } });
    return r.comments as PostComment[];
  } catch {
    return null;
  }
}

export async function deletePostComment(commentId: string) {
  try {
    const r = await svrDeletePostComment({ data: { commentId, viewerKey: getViewerKey() } });
    return r.comments as PostComment[];
  } catch {
    return null;
  }
}
