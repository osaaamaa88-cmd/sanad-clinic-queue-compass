type NemoFaceSvgProps = {
  happy?: boolean;
  className?: string;
  /** Pupil offset in SVG units (-1..1 scaled to ~4px), for eye tracking. */
  look?: { x: number; y: number };
  /** Extra expressions used by the floating companion. */
  mood?: "normal" | "surprised" | "sleepy";
};

/**
 * Nemo's simple vector face for the health assistant.
 * Keeps the shared `nemo-eye` blink animation hooks so existing CSS
 * (styles.css) drives blinking and reduced-motion behavior.
 */
export function NemoFaceSvg({ happy = false, className, look, mood = "normal" }: NemoFaceSvgProps) {
  const lx = (look?.x ?? 0) * 4;
  const ly = (look?.y ?? 0) * 3;
  const eyeRy = mood === "surprised" ? 9 : mood === "sleepy" ? 1.5 : 7;
  const eyeRx = mood === "surprised" ? 6 : 5;
  return (
    <svg
      viewBox="0 0 120 92"
      role="img"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <defs>
        <linearGradient id="nemo-face-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f4f9ff" />
          <stop offset="100%" stopColor="#d9e9fb" />
        </linearGradient>
        <linearGradient id="nemo-face-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#99f6e4" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Head */}
      <rect
        x="6"
        y="6"
        width="108"
        height="80"
        rx="40"
        fill="url(#nemo-face-fill)"
        stroke="#bae6fd"
        strokeWidth="1.5"
      />
      {/* Forehead shine */}
      <rect
        x="40"
        y="3"
        width="40"
        height="10"
        rx="5"
        fill="url(#nemo-face-shine)"
      />
      {/* Cheek pads */}
      <ellipse cx="16" cy="48" rx="5" ry="9" fill="#cffafe" opacity="0.85" />
      <ellipse cx="104" cy="48" rx="5" ry="9" fill="#cffafe" opacity="0.85" />

      {/* Eyes — keep as the first two children of this group so
          `.nemo-eye:nth-child(2)` staggered blinking keeps working */}
      <g
        style={{ transform: `translate(${lx}px, ${ly}px)`, transition: "transform 180ms ease-out" }}
      >
        {happy ? (
          <>
            <path
              className="nemo-eye"
              d="M36 44 Q42 37 48 44"
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              className="nemo-eye"
              d="M72 44 Q78 37 84 44"
              fill="none"
              stroke="#1e293b"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <ellipse className="nemo-eye" cx="42" cy="42" rx={eyeRx} ry={eyeRy} fill="#1e293b" style={{ transition: "ry 200ms ease, rx 200ms ease" }} />
            <ellipse className="nemo-eye" cx="78" cy="42" rx={eyeRx} ry={eyeRy} fill="#1e293b" style={{ transition: "ry 200ms ease, rx 200ms ease" }} />
          </>
        )}
      </g>

      {/* Smile */}
      <path
        d="M46 60 Q60 70 74 60"
        fill="none"
        stroke="#0e7490"
        strokeWidth="3"
        strokeLinecap="round"
        style={{
          transform: happy ? "scale(1.15)" : "scale(1)",
          transformOrigin: "60px 62px",
          transition: "transform 220ms ease",
        }}
      />
    </svg>
  );
}
