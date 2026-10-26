import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useFloatingVoiceAssistant } from "@/hooks/use-floating-voice-assistant";

const POSITION_KEY = "sanad-nemo-widget-position";
const BUTTON_SIZE = 56;
const VIEWPORT_GAP = 12;
const DRAG_THRESHOLD = 6;

type Position = { x: number; y: number };
type DragStart = { pointerId: number; x: number; y: number; offsetX: number; offsetY: number };

function clampPosition(position: Position): Position {
  return {
    x: Math.max(VIEWPORT_GAP, Math.min(position.x, window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP)),
    y: Math.max(
      VIEWPORT_GAP,
      Math.min(position.y, window.innerHeight - BUTTON_SIZE - VIEWPORT_GAP),
    ),
  };
}

function getInitialPosition(): Position {
  const fallback = {
    x: window.innerWidth - BUTTON_SIZE - 20,
    y: window.innerHeight - BUTTON_SIZE - 96,
  };
  try {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored) {
      const position = JSON.parse(stored) as Position;
      if (Number.isFinite(position.x) && Number.isFinite(position.y)) {
        return clampPosition(position);
      }
    }
  } catch (error) {
    console.warn("[NemoWidget] Could not load saved position", error);
  }
  return clampPosition(fallback);
}

export function FloatingVoiceAssistant() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The dedicated Nemo page owns its microphone; all other routes share this root-mounted lifecycle.
  const voice = useFloatingVoiceAssistant(pathname !== "/patient/assistant");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const initialPosition = getInitialPosition();
    positionRef.current = initialPosition;
    setPosition(initialPosition);
    setMounted(true);

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        movedRef.current = true;
      }
      if (!movedRef.current) return;
      event.preventDefault();
      const nextPosition = clampPosition({
        x: event.clientX - dragStart.offsetX,
        y: event.clientY - dragStart.offsetY,
      });
      positionRef.current = nextPosition;
      if (buttonRef.current) {
        buttonRef.current.style.left = `${nextPosition.x}px`;
        buttonRef.current.style.top = `${nextPosition.y}px`;
      }
    };
    const onPointerEnd = (event: globalThis.PointerEvent) => {
      const dragStart = dragStartRef.current;
      if (dragStart?.pointerId !== event.pointerId) return;
      dragStartRef.current = null;
      if (!movedRef.current) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 400);
      const finalPosition =
        event.type === "pointercancel"
          ? positionRef.current
          : clampPosition({
              x: event.clientX - dragStart.offsetX,
              y: event.clientY - dragStart.offsetY,
            });
      positionRef.current = finalPosition;
      setPosition(finalPosition);
      if (buttonRef.current) {
        buttonRef.current.style.left = `${finalPosition.x}px`;
        buttonRef.current.style.top = `${finalPosition.y}px`;
      }
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(finalPosition));
      } catch (error) {
        console.warn("[NemoWidget] Could not save position", error);
      }
    };
    const onResize = () => {
      const nextPosition = clampPosition(positionRef.current);
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!mounted || pathname === "/patient/assistant") return null;

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    movedRef.current = false;
  };

  const onClick = () => {
    if (movedRef.current || suppressClickRef.current) {
      movedRef.current = false;
      return;
    }
    if (voice.enabled) {
      voice.resume();
      return;
    }
    void navigate({ to: "/patient/assistant" });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={onPointerDown}
      onClick={onClick}
      aria-label={voice.enabled ? "نيمو، استئناف المساعد الصوتي" : "نيمو، افتح المساعد الصحي"}
      title={
        voice.enabled ? voice.message || "نيمو | المساعد الصوتي" : "نيمو | رفيق الرعاية الصحية"
      }
      dir="rtl"
      className="group fixed z-[99999] grid h-14 w-14 touch-none place-items-center rounded-full border border-amber-100 bg-white text-cyan-800 shadow-[0_6px_24px_rgba(34,211,238,0.2)] transition-shadow hover:shadow-[0_8px_30px_rgba(34,211,238,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      style={{ left: position.x, top: position.y }}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {voice.enabled ? voice.message : ""}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-full bg-cyan-100/60 motion-safe:animate-pulse"
      />
      <NemoFaceSvg
        className="nemo-breathe relative z-10 h-10 w-11 drop-shadow-[0_2px_6px_rgba(34,211,238,0.25)]"
      />
    </button>
  );
}
