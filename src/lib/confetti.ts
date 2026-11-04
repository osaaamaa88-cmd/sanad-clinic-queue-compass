/** احتفال خفيف بألوان الهوية؛ يُحمَّل عند الطلب فقط ويحترم تقليل الحركة. */
export async function celebrate() {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const styles = getComputedStyle(document.documentElement);
  const colors = ["--primary", "--gold", "--success"]
    .map((v) => styles.getPropertyValue(v).trim())
    .filter(Boolean);
  const { default: confetti } = await import("canvas-confetti");
  void confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
}
