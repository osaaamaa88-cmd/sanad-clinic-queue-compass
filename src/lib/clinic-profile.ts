import {
  svrGetClinicProfile,
  svrClinicQueueStats,
  svrToggleFollow,
  svrIsFollowing,
  svrUpdateClinicProfile,
  svrUploadClinicMedia,
  svrDeleteClinicPost,
} from "@/lib/profile.functions";

export type ClinicPost = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  caption: string;
};

export type ClinicProfileExtras = {
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  posts: ClinicPost[];
  postsCount: number;
  followers: number;
  ratingAvg: number;
  reviewsCount: number;
};

export type QueueStats = {
  nowServing: number;
  waiting: number;
  delayMinutes: number;
  bookingsClosed: boolean;
};

const FOLLOW_KEY = "sanad_follower_key";
const LEGACY_FOLLOW_KEY = "sandi_follower_key";

/** Stable anonymous key per device, used to count real followers. */
export function getFollowerKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(FOLLOW_KEY) ?? localStorage.getItem(LEGACY_FOLLOW_KEY);
  if (!key) {
    key = `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  localStorage.setItem(FOLLOW_KEY, key);
  return key;
}

export async function getClinicProfileExtras(clinicId: string): Promise<ClinicProfileExtras> {
  try {
    return await svrGetClinicProfile({ data: { clinicId } });
  } catch {
    return {
      bio: "",
      avatarUrl: "",
      coverUrl: "",
      posts: [],
      postsCount: 0,
      followers: 0,
      ratingAvg: 0,
      reviewsCount: 0,
    };
  }
}

export async function getQueueStats(clinicId: string): Promise<QueueStats | null> {
  try {
    const r = await svrClinicQueueStats({ data: { clinicId } });
    return {
      nowServing: r.nowServing,
      waiting: r.waiting,
      delayMinutes: r.delayMinutes,
      bookingsClosed: r.bookingsClosed,
    };
  } catch {
    return null;
  }
}

export async function isFollowingClinic(clinicId: string): Promise<boolean> {
  try {
    const r = await svrIsFollowing({ data: { clinicId, followerKey: getFollowerKey() } });
    return r.following;
  } catch {
    return false;
  }
}

export async function toggleFollowClinic(clinicId: string, follow: boolean) {
  try {
    return await svrToggleFollow({ data: { clinicId, followerKey: getFollowerKey(), follow } });
  } catch {
    return null;
  }
}

export async function saveClinicProfile(input: {
  clinicId: string;
  doctor?: string;
  specialtyId?: string;
  price?: number;
  phone?: string;
  bio?: string;
  workingHours?: string;
}): Promise<boolean> {
  try {
    await svrUpdateClinicProfile({ data: input });
    return true;
  } catch {
    return false;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export async function uploadClinicMedia(input: {
  clinicId: string;
  kind: "avatar" | "cover" | "post";
  file: File;
  caption?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const base64 = await fileToBase64(input.file);
    await svrUploadClinicMedia({
      data: {
        clinicId: input.clinicId,
        kind: input.kind,
        fileName: input.file.name,
        contentType: input.file.type || "image/jpeg",
        base64,
        caption: input.caption ?? "",
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message };
  }
}

export async function deleteClinicPost(postId: string): Promise<boolean> {
  try {
    await svrDeleteClinicPost({ data: { postId } });
    return true;
  } catch {
    return false;
  }
}
