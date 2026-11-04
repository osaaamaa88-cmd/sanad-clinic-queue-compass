import { lazy, Suspense, useState } from "react";
import "yet-another-react-lightbox/styles.css";

const Lightbox = lazy(async () => {
  const [{ default: L }, { default: Zoom }] = await Promise.all([
    import("yet-another-react-lightbox"),
    import("yet-another-react-lightbox/plugins/zoom"),
  ]);
  return { default: (p: { open: boolean; close: () => void; src: string }) => <L open={p.open} close={p.close} slides={[{ src: p.src }]} plugins={[Zoom]} zoom={{ maxZoomPixelRatio: 4 }} carousel={{ finite: true }} render={{ buttonPrev: () => null, buttonNext: () => null }} /> };
});

/** صورة قابلة للفتح بشاشة كاملة مع تكبير باللمس — للتحاليل والأشعة. */
export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`تكبير ${alt}`} className="block">
        <img src={src} alt={alt} className={className} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <Lightbox open={open} close={() => setOpen(false)} src={src} />
        </Suspense>
      )}
    </>
  );
}
