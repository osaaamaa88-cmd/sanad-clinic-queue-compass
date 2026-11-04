/** Browser-safe community rules: personal-data detection, paging, answer ordering. */

export type FeedTab = "for_you" | "questions" | "doctors" | "following";
export type AnsweredFilter = "all" | "unanswered" | "answered";

export type TopDoctorComment = {
  id: string;
  author_name: string;
  clinic_id: string;
  avatar_url: string;
  body: string;
  created_at: string;
};

export type FeedPost = {
  id: string;
  author_name: string;
  is_anonymous: boolean;
  is_mine: boolean;
  clinic_id: string | null;
  doctor_name: string | null;
  doctor_avatar: string | null;
  kind: string;
  body: string;
  bg_style: string;
  font_style: string;
  image_path: string;
  specialty_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  my_liked: boolean;
  my_saved: boolean;
  answered_by_doctor: boolean;
  top_doctor_comment: TopDoctorComment | null;
};

export type FeedCursor = { created_at: string; id: string } | null;

export const FEED_PAGE_SIZE = 10;

/** Next cursor: last post of a full page; null when the page was short (end of feed). */
export function nextCursor(page: FeedPost[], pageSize = FEED_PAGE_SIZE): FeedCursor {
  if (page.length < pageSize) return null;
  const last = page[page.length - 1];
  return { created_at: last.created_at, id: last.id };
}

/** Flatten pages, dropping duplicates (a post can shift pages when new ones arrive). */
export function flattenPages(pages: FeedPost[][]): FeedPost[] {
  const seen = new Set<string>();
  const out: FeedPost[] = [];
  for (const page of pages)
    for (const p of page) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  return out;
}

const toLatinDigits = (s: string) =>
  s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

export type PersonalDataKind = "national_id" | "phone" | "email" | "link";

/** Personal data that must be removed before a community post is published. */
export function detectPersonalData(text: string): PersonalDataKind[] {
  const t = toLatinDigits(text);
  const compact = t.replace(/[\s\-.]/g, "");
  const found: PersonalDataKind[] = [];
  if (/(?<!\d)[23]\d{13}(?!\d)/.test(compact)) found.push("national_id");
  if (/(?<!\d)(?:\+?20|0020)?0?1[0125]\d{8}(?!\d)/.test(compact)) found.push("phone");
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)) found.push("email");
  if (/(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|eg|io|me|ly)\b/i.test(t)) found.push("link");
  return found;
}

export const PERSONAL_DATA_LABEL: Record<PersonalDataKind, string> = {
  national_id: "رقم قومي",
  phone: "رقم موبايل",
  email: "إيميل",
  link: "رابط",
};

type CommentLike = { created_at: string; is_doctor: boolean };

/** Verified-doctor answers first, then newest first. */
export function sortComments<T extends CommentLike>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.is_doctor !== b.is_doctor) return a.is_doctor ? -1 : 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}
