import { toast } from "sonner";
import { svrCreateUploadTicket, svrFinalizeUpload } from "@/lib/media.functions";

export type UploadKind = "avatar" | "cover" | "post" | "story";
const MB = 1024 * 1024;
export const LIMITS = { avatar: 5 * MB, media: 50 * MB };
const MAX_DIM: Record<UploadKind, number> = { avatar: 512, cover: 1600, post: 1440, story: 1440 };

/** Resize + re-encode images in the browser (WebP when supported, JPEG fallback). GIFs are kept as-is. */
export async function compressImage(file: File, maxDim: number, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const toBlob = (type: string) => new Promise<Blob | null>((r) => c.toBlob(r, type, quality));
    let blob = await toBlob("image/webp");
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") { blob = await toBlob("image/jpeg"); ext = "jpg"; }
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}

function putWithProgress(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("UPLOAD_FAILED")));
    xhr.onerror = () => reject(new Error("NETWORK"));
    xhr.send(file);
  });
}

const fmt = (b: number) => `${(b / MB).toFixed(1)}MB`;

/** Validate, compress, upload with live progress toast, then record it. */
export async function uploadMedia(input: {
  clinicId: string;
  kind: UploadKind;
  file: File;
  caption?: string;
  highlightId?: string | null;
  storyKind?: "story" | "urgent";
  tag?: string;
  permanent?: boolean;
  durationHours?: 12 | 24;
}): Promise<{ ok: boolean; error?: string }> {
  const { kind } = input;
  const isImage = input.file.type.startsWith("image/");
  const isVideo = input.file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    toast.error("نوع الملف غير مدعوم", { description: "ارفع صورة أو فيديو فقط." });
    return { ok: false, error: "INVALID_TYPE" };
  }
  if ((kind === "avatar" || kind === "cover") && !isImage) {
    toast.error("لازم تختار صورة", { description: "الصورة الشخصية والغلاف صور فقط." });
    return { ok: false, error: "INVALID_TYPE" };
  }
  const file = isImage ? await compressImage(input.file, MAX_DIM[kind]) : input.file;
  const max = kind === "avatar" ? LIMITS.avatar : LIMITS.media;
  if (file.size > max) {
    toast.error("الملف أكبر من المسموح", {
      description: `حجم الملف ${fmt(file.size)} والحد الأقصى ${fmt(max)}.${isVideo ? " قصّر الفيديو أو استخدم رابط YouTube." : ""}`,
      duration: 6000,
    });
    return { ok: false, error: "FILE_TOO_LARGE" };
  }

  const id = toast.loading("جاري الرفع… 0%");
  try {
    const ticket = await svrCreateUploadTicket({
      data: { clinicId: input.clinicId, kind, fileName: file.name, contentType: file.type, size: file.size },
    });
    await putWithProgress(ticket.signedUrl, file, (p) => toast.loading(`جاري الرفع… ${p}%`, { id }));
    toast.loading("جاري الحفظ…", { id });
    await svrFinalizeUpload({
      data: {
        clinicId: input.clinicId, kind, path: ticket.path, contentType: file.type,
        caption: input.caption, highlightId: input.highlightId ?? null, storyKind: input.storyKind,
        tag: input.tag, permanent: input.permanent, durationHours: input.durationHours,
      },
    });
    toast.success("تم الرفع بنجاح ✅", { id });
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    toast.error(
      msg === "FILE_TOO_LARGE" ? "الملف أكبر من المسموح" : msg === "NETWORK" ? "انقطع الاتصال أثناء الرفع" : "تعذر رفع الملف، حاول تاني",
      { id },
    );
    return { ok: false, error: msg };
  }
}
