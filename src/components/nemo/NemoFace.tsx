import { NemoFaceSvg } from "@/components/NemoFaceSvg";

type NemoFaceProps = {
  speaking: boolean;
  emergency: boolean;
  happy: boolean;
  listening: boolean;
  onActivate: () => void;
};

export function NemoFace({ speaking, emergency, happy, listening, onActivate }: NemoFaceProps) {
  return (
    <button
      type="button"
      onClick={onActivate}
      disabled={happy}
      aria-pressed={listening}
      aria-label={listening ? "إيقاف استماع نيمو" : "اضغط للتحدث مع نيمو"}
      title={listening ? "إيقاف استماع نيمو" : "اضغط للتحدث مع نيمو"}
      className={`nemo-breathe relative mx-auto grid h-16 w-20 place-items-center rounded-[46%_46%_43%_43%] border border-primary/20 bg-gradient-to-b from-card via-card to-primary/10 shadow-soft transition-shadow duration-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default ${
        speaking ? "nemo-speaking-glow" : ""
      } ${emergency ? "nemo-emergency-flash shadow-[0_0_48px_-12px_rgba(251,146,60,0.5)]" : ""}`}
    >
      <NemoFaceSvg happy={happy} className="h-full w-full" />
      {speaking && (
        <span className="absolute -bottom-2 flex items-center gap-1" aria-hidden="true">
          <span className="h-1 w-1 animate-ping rounded-full bg-primary" />
          <span className="h-1 w-1 animate-pulse rounded-full bg-primary/60" />
          <span className="h-1 w-1 animate-ping rounded-full bg-primary [animation-delay:250ms]" />
        </span>
      )}
    </button>
  );
}
