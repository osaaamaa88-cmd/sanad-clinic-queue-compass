/** 4-7-8 calming breath protocol used by Nemo. Pure + browser-safe. */
export type BreathPhase = { key: "inhale" | "hold" | "exhale"; label: string; seconds: number };

export const BREATH_PATTERN: BreathPhase[] = [
  { key: "inhale", label: "شهيق بهدوء من أنفك", seconds: 4 },
  { key: "hold", label: "احبس نفسك براحة", seconds: 7 },
  { key: "exhale", label: "زفير ببطء من بُقّك", seconds: 8 },
];

export const BREATH_CYCLE_SECONDS = BREATH_PATTERN.reduce((s, p) => s + p.seconds, 0);

/** Returns the phase and remaining seconds for an elapsed time (seconds). */
export function breathPhaseAt(elapsed: number): {
  phase: BreathPhase;
  remaining: number;
  cycle: number;
} {
  const t = Math.max(0, elapsed);
  const cycle = Math.floor(t / BREATH_CYCLE_SECONDS);
  let within = t % BREATH_CYCLE_SECONDS;
  for (const phase of BREATH_PATTERN) {
    if (within < phase.seconds)
      return { phase, remaining: Math.ceil(phase.seconds - within), cycle };
    within -= phase.seconds;
  }
  return { phase: BREATH_PATTERN[0], remaining: BREATH_PATTERN[0].seconds, cycle };
}
