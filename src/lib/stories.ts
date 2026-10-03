import {
  svrGetClinicStories,
  svrAddStory,
  svrDeleteStory,
  svrCreateHighlight,
  svrDeleteHighlight,
} from "@/lib/stories.functions";

export type StoryItem = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  caption: string;
  kind: "story" | "urgent";
  highlightId: string | null;
  createdAt: string;
};

export type Highlight = { id: string; title: string; emoji: string; items: StoryItem[] };

export type ClinicStories = { stories: StoryItem[]; highlights: Highlight[] };

export async function getClinicStories(clinicId: string): Promise<ClinicStories> {
  try {
    return await svrGetClinicStories({ data: { clinicId } });
  } catch {
    return { stories: [], highlights: [] };
  }
}

export async function addStory(input: {
  clinicId: string;
  file?: File | null;
  caption?: string;
  kind?: "story" | "urgent";
  highlightId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (input.file) {
    const { uploadMedia } = await import("@/lib/media-upload");
    return uploadMedia({
      clinicId: input.clinicId, kind: "story", file: input.file, caption: input.caption,
      highlightId: input.highlightId ?? null, storyKind: input.kind ?? "story",
    });
  }
  try {
    const base64 = "";
    await svrAddStory({
      data: {
        clinicId: input.clinicId,
        kind: input.kind ?? "story",
        caption: input.caption ?? "",
        highlightId: input.highlightId ?? null,
        fileName: "story",
        contentType: "",
        base64,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message };
  }
}

export async function deleteStory(storyId: string): Promise<boolean> {
  try {
    await svrDeleteStory({ data: { storyId } });
    return true;
  } catch {
    return false;
  }
}

export async function createHighlight(clinicId: string, title: string, emoji: string): Promise<string | null> {
  try {
    const r = await svrCreateHighlight({ data: { clinicId, title, emoji } });
    return r.id;
  } catch {
    return null;
  }
}

export async function deleteHighlight(highlightId: string): Promise<boolean> {
  try {
    await svrDeleteHighlight({ data: { highlightId } });
    return true;
  } catch {
    return false;
  }
}