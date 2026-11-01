interface SanadLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function SanadLogo({ className = "", size = 36, showText = false }: SanadLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform duration-300 hover:scale-105"
        role="img"
        aria-label="شعار سند"
      >
        <defs>
          <linearGradient id="sanad-gradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="45%" stopColor="#38bdf8" />
            <stop offset="75%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Pulse ECG Heart Ribbon (S-Curve & Heartbeat) */}
        <path
          d="M 50,82 C 32,70 18,54 18,36 C 18,22 28,14 40,14 C 47,14 50,18 50,18 C 50,18 53,14 60,14 C 72,14 82,22 82,36 C 82,54 68,70 50,82 Z"
          stroke="url(#sanad-gradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="url(#soft-glow)"
        />

        {/* Dynamic ECG Heartbeat Line crossing center */}
        <path
          d="M 28,45 L 42,45 L 47,32 L 53,58 L 58,45 L 72,45"
          stroke="url(#sanad-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showText && (
        <div className="flex flex-col text-right leading-none">
          <span className="font-bold text-lg tracking-tight text-foreground">سند</span>
          <span className="text-xs text-muted-foreground font-medium tracking-wider">SANAD</span>
        </div>
      )}
    </div>
  );
}
