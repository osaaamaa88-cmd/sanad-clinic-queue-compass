import { useEffect, useRef, useState } from "react";

/** يخفي العنصر عند التمرير لأسفل ويُظهره عند الصعود (مثل فيسبوك). */
export function useHideOnScroll(threshold = 12, topOffset = 60) {
  const [hidden, setHidden] = useState(false);
  const last = useRef(new WeakMap<object, number>());

  useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target;
      const el = t === document || t === window ? document.scrollingElement : (t as HTMLElement);
      if (!el || !(el instanceof HTMLElement)) return;
      // تجاهل التمرير الأفقي (مثل شريط الستوري)
      if (el.scrollHeight <= el.clientHeight + 4) return;
      const y = el.scrollTop;
      const prev = last.current.get(el) ?? y;
      if (y < topOffset) {
        setHidden(false);
      } else if (y - prev > threshold) {
        setHidden(true);
      } else if (prev - y > threshold) {
        setHidden(false);
      } else return;
      last.current.set(el, y);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, [threshold, topOffset]);

  return hidden;
}
