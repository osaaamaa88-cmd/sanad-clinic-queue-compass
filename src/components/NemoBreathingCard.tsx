import { useEffect, useRef, useState } from "react";
import { Wind, X } from "lucide-react";
import { breathPhaseAt } from "@/lib/breathing";
import { isSoundOn, playClick } from "@/lib/sounds";

/** Nemo calm mode: guided 4-7-8 breathing with soft haptics. Shared across home and Nemo. */
export function NemoBreathingCard({ forceOpen = false }: { forceOpen?: boolean } = {}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const lastPhase = useRef<string>("");

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const id = window.setInterval(() => setElapsed((performance.now() - start) / 1000), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const { phase, remaining, cycle } = breathPhaseAt(elapsed);

  useEffect(() => {
    if (!running || lastPhase.current === phase.key) return;
    lastPhase.current = phase.key;
    navigator.vibrate?.(phase.key === "hold" ? 8 : [14, 40, 14]);
    if (isSoundOn()) playClick();
  }, [phase.key, running]);

  const stop = () => {
    setRunning(false);
    setElapsed(0);
    lastPhase.current = "";
  };

  useEffect(() => {
    if (!forceOpen) return;
    setRunning(true);
    return () => setRunning(false);
  }, [forceOpen]);

  const scale = !running ? 0.7 : phase.key === "inhale" ? 1 : phase.key === "hold" ? 1 : 0.6;
  const duration = phase.key === "inhale" ? 4 : phase.key === "exhale" ? 8 : 0.3;

  return (
    <section
      aria-label="تمرين التهدئة مع نيمو"
      className="card-medical-mint order-4 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wind className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">خد نفس مع نيمو</h2>
        </div>
        {running && (
          <button
            type="button"
            onClick={stop}
            aria-label="إيقاف التمرين"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {running ? (
        <div className="mt-4 flex flex-col items-center gap-3" aria-live="polite">
          <div className="grid h-36 w-36 place-items-center">
            <div
              className="grid h-36 w-36 place-items-center rounded-full bg-primary/15 ring-8 ring-primary/10"
              style={{
                transform: `scale(${scale})`,
                transition: `transform ${duration}s ease-in-out`,
              }}
            >
              <span className="text-3xl font-bold text-primary">{remaining}</span>
            </div>
          </div>
          <p className="text-base font-semibold text-foreground">{phase.label}</p>
          <p className="text-xs text-muted-foreground">
            الدورة {cycle + 1} — كمّل 4 دورات وهتحس براحة
          </p>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-muted-foreground">
            قلقان أو متوتر؟ تمرين 4-7-8 بيهدّي ضربات القلب في دقيقة واحدة.
          </p>
          <button
            type="button"
            onClick={() => setRunning(true)}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
          >
            ابدأ
          </button>
        </div>
      )}
    </section>
  );
}
