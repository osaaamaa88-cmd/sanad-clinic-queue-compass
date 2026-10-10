/** Downscale an image file to JPEG base64 (no data: prefix) for AI analysis. */
export async function imageToBase64(file: File, max = 1600): Promise<{ data: string; mime: string; preview: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const preview = c.toDataURL("image/jpeg", 0.85);
    return { data: preview.split(",")[1], mime: "image/jpeg", preview };
  } finally {
    URL.revokeObjectURL(url);
  }
}
