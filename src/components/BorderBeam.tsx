import type { CSSProperties } from "react";

/**
 * BorderBeam — هالة ضوئية دوّارة على حواف الكارت (مستوحاة من 21st.dev / Magic UI).
 *
 * آلية العمل: طبقة مطلقة داخل عنصر `relative overflow-hidden`، تدور حول
 * محيط الكارت عبر CSS conic-gradient مع تكبير بسيط لضمان تغطية الحواف.
 * الحجم والمدة والألوان كلها Design Tokens قابلة للتخصيص.
 */
export function BorderBeam({
  /** حجم الشعاع الضوئي بالبكسل (سمك الهالة) */
  size = 60,
  /** مدة الدورة الكاملة بالثواني */
  duration = 6,
  /** تأخير البدء بالثواني — مفيد عند عدة أشعة على نفس الكارت */
  delay = 0,
  /** لون ذيل الشعاع (يذ شفاف) */
  colorFrom = "var(--color-primary)",
  /** رأس الشعاع الساطع */
  colorTo = "transparent",
  /** عرض الحافة التي يظهر عليها الشعاع */
  borderWidth = 1.5,
  reverse = false,
}: {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  reverse?: boolean;
}) {
  const style: CSSProperties = {
    ["--border-beam-size" as string]: `${size}px`,
    ["--border-beam-from" as string]: colorFrom,
    ["--border-beam-to" as string]: colorTo,
    ["--border-beam-width" as string]: `${borderWidth}px`,
    animationDuration: `${duration}s`,
    animationDelay: `-${delay}s`,
    animationDirection: reverse ? "reverse" : "normal",
  };

  return (
    <span
      aria-hidden="true"
      className="border-beam pointer-events-none absolute inset-0 rounded-[inherit]"
      style={style}
    />
  );
}
