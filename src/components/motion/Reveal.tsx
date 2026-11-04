import { useEffect, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "react-intersection-observer";

let readySet = false;

/** Fades/rises its content in when scrolled into view; staggered by index. Content stays visible without JS. */
export function Reveal({
  children,
  className = "",
  index = 0,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: ElementType;
  [key: string]: unknown;
}) {
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: "0px 0px -6% 0px" });
  useEffect(() => {
    if (!readySet) {
      readySet = true;
      document.documentElement.dataset.revealReady = "true";
    }
  }, []);
  return (
    <Tag
      {...rest}
      ref={ref}
      data-reveal
      data-revealed={inView || undefined}
      className={className}
      style={{ "--reveal-index": Math.min(index, 6) } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
