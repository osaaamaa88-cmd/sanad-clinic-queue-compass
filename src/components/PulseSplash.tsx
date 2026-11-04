import sanadLogo from "@/assets/sanad-logo.png";
import { useEffect, useState } from "react";
import { playHeartbeat } from "@/lib/sounds";

export function PulseSplash({
  onDone,
  duration = 2000,
}: {
  onDone: () => void;
  duration?: number;
}) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    playHeartbeat();
    const a = setTimeout(() => setLeaving(true), duration - 300);
    const b = setTimeout(onDone, duration);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [duration, onDone]);
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${leaving ? "scale-105 opacity-0 blur-sm" : "scale-100 opacity-100"} transition-all ease-out`}
      aria-label="سند"
    >
      <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative grid h-28 w-28 place-items-center">
        <span className="sanad-ring absolute inset-0 rounded-full bg-primary/25" />
        <span className="sanad-ring absolute inset-0 rounded-full bg-primary/20 [animation-delay:0.5s]" />
        <span className="sanad-ring absolute inset-0 rounded-full bg-gold/15 [animation-delay:1s]" />
        <div className="sanad-beat relative grid h-24 w-24 place-items-center rounded-[2rem] bg-surface-deep shadow-soft">
          <img src={sanadLogo} alt="" width={400} height={400} className="h-16 w-16" />
        </div>
      </div>
      <svg viewBox="0 0 200 40" className="mt-6 h-8 w-56 text-primary drop-shadow-[0_0_6px_var(--primary)]" fill="none">
        <path
          className="sanad-ekg"
          d="M0 20 H60 L70 8 L80 32 L90 4 L100 36 L110 20 H200"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1 className="mt-3 text-3xl font-extrabold">سند</h1>
      <p className="mt-1 text-sm text-muted-foreground">سندك الطبي في كل وقت</p>
    </div>
  );
}
