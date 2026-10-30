import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { useTheme } from "@/lib/theme";

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, toggle } = useTheme();

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const doc = document as VTDoc;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) return toggle();
    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || window.innerHeight / 2;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const t = doc.startViewTransition(() => {
      // flushSync-free: toggle applies the class synchronously
      toggle();
    });
    void t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 550, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return (
    <button
      onClick={onClick}
      aria-label={mode === "dark" ? "تشغيل الوضع النهاري" : "تشغيل الوضع المظلم"}
      title={mode === "dark" ? "الوضع النهاري" : "الوضع المظلم"}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary text-foreground transition-transform active:scale-90 ${className}`}
    >
      {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
