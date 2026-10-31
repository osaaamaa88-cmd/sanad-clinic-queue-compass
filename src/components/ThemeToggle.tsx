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
      className={`btn-liquid-glass grid h-9 w-9 shrink-0 place-items-center rounded-full text-primary ${className}`}
    >
      {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
