import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { circularReveal, useTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, toggle } = useTheme();

  const onClick = (e: MouseEvent<HTMLButtonElement>) => circularReveal(e, toggle);

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
