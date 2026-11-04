/** يضغط الصور الأكبر من 1MB قبل الرفع مع الحفاظ على وضوح نصوص التقارير. */
export async function compressImage(file: File): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/") || file.size < 1024 * 1024) return file;
  if (file.type === "image/gif") return file;
  const { default: Compressor } = await import("compressorjs");
  return new Promise((resolve) => {
    new Compressor(file, {
      quality: 0.82,
      maxWidth: 2048,
      maxHeight: 2048,
      success: (out) => resolve(new File([out], file.name, { type: out.type || file.type })),
      error: () => resolve(file),
    });
  });
}
