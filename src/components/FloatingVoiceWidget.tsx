import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useFloatingVoiceAssistant } from "@/hooks/use-floating-voice-assistant";
import { NemoFaceSvg } from "@/components/NemoFaceSvg";

const POSITION_KEY = "sanad-nemo-widget-position";
const BUTTON_SIZE = 56;
const VIEWPORT_GAP = 12;
const DRAG_THRESHOLD = 6;
const IDLE_SLEEP_MS = 60000;
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type Position = { x: number; y: number };
type DragStart = { pointerId: number; x: number; y: number; offsetX: number; offsetY: number };
type Mood = "normal" | "surprised" | "sleepy" | "happy";

function clampPosition(position: Position): Position {
  return {
    x: Math.max(VIEWPORT_GAP, Math.min(position.x, window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP)),
    y: Math.max(VIEWPORT_GAP, Math.min(position.y, window.innerHeight - BUTTON_SIZE - VIEWPORT_GAP)),
  };
}

/** Coucou-style magnetic docking: always rest on the nearest side edge. */
function dockToEdge(position: Position): Position {
  const clamped = clampPosition(position);
  const center = clamped.x + BUTTON_SIZE / 2;
  const x =
    center < window.innerWidth / 2 ? VIEWPORT_GAP : window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP;
  return { x, y: clamped.y };
}

function getInitialPosition(): Position {
  const fallback = {
    x: window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP,
    y: window.innerHeight - BUTTON_SIZE - 110,
  };
  try {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored) {
      const position = JSON.parse(stored) as Position;
      if (Number.isFinite(position.x) && Number.isFinite(position.y)) return dockToEdge(position);
    }
  } catch (error) {
    console.warn("[NemoWidget] Could not load saved position", error);
  }
  return dockToEdge(fallback);
}

function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

export function FloatingVoiceAssistant() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The dedicated Nemo page owns its microphone; all other routes share this root-mounted lifecycle.
  const voice = useFloatingVoiceAssistant(pathname !== "/patient/assistant");
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const idleTimerRef = useRef<number | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [mood, setMood] = useState<Mood>("normal");
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [bubbleOpen, setBubbleOpen] = useState(false);

  useEffect(() => {
    const initialPosition = getInitialPosition();
    positionRef.current = initialPosition;
    setPosition(initialPosition);
    setMounted(true);

    const wake = () => {
      setMood((m) => (m === "sleepy" ? "normal" : m));
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => setMood("sleepy"), IDLE_SLEEP_MS);
    };
    wake();

    // Eye tracking: pupils follow wherever the user touches or points.
    const track = (clientX: number, clientY: number) => {
      const cx = positionRef.current.x + BUTTON_SIZE / 2;
      const cy = positionRef.current.y + BUTTON_SIZE / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const strength = Math.min(1, dist / 160);
      setLook({ x: (dx / dist) * strength, y: (dy / dist) * strength });
    };

    const onPointerDownGlobal = (event: globalThis.PointerEvent) => {
      wake();
      track(event.clientX, event.clientY);
    };

    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "mouse") track(event.clientX, event.clientY);
      const dragStart = dragStartRef.current;
      if (!dragStart || dragStart.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      if (
        !movedRef.current &&
        (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD)
      ) {
        movedRef.current = true;
        setDragging(true);
        setBubbleOpen(false);
        setMood("surprised");
        haptic(8);
      }
      if (!movedRef.current) return;
      event.preventDefault();
      const next = clampPosition({
        x: event.clientX - dragStart.offsetX,
        y: event.clientY - dragStart.offsetY,
      });
      // Squash & stretch along the drag velocity.
      const now = performance.now();
      const last = lastMoveRef.current;
      if (last && bodyRef.current) {
        const dt = Math.max(1, now - last.t);
        const vx = (event.clientX - last.x) / dt;
        const vy = (event.clientY - last.y) / dt;
        const speed = Math.min(1.6, Math.hypot(vx, vy));
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        const stretch = 1 + speed * 0.18;
        const squash = 1 - speed * 0.12;
        bodyRef.current.style.transform = `rotate(${angle}deg) scale(${stretch}, ${squash}) rotate(${-angle}deg)`;
      }
      lastMoveRef.current = { x: event.clientX, y: event.clientY, t: now };
      positionRef.current = next;
      if (wrapRef.current) {
        wrapRef.current.style.left = `${next.x}px`;
        wrapRef.current.style.top = `${next.y}px`;
      }
    };

    const onPointerEnd = (event: globalThis.PointerEvent) => {
      const dragStart = dragStartRef.current;
      if (dragStart?.pointerId !== event.pointerId) return;
      dragStartRef.current = null;
      lastMoveRef.current = null;
      if (!movedRef.current) return;
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 400);
      const docked = dockToEdge(positionRef.current);
      positionRef.current = docked;
      setDragging(false);
      setPosition(docked);
      setMood("normal");
      haptic(14);
      // Landing squash, then jelly bounce back.
      if (bodyRef.current) {
        bodyRef.current.style.transform = "scale(1.18, 0.82)";
        window.setTimeout(() => {
          if (bodyRef.current) bodyRef.current.style.transform = "scale(1, 1)";
        }, 140);
      }
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(docked));
      } catch (error) {
        console.warn("[NemoWidget] Could not save position", error);
      }
    };

    const onResize = () => {
      const next = dockToEdge(positionRef.current);
      positionRef.current = next;
      setPosition(next);
    };

    window.addEventListener("pointerdown", onPointerDownGlobal);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(idleTimerRef.current);
      window.removeEventListener("pointerdown", onPointerDownGlobal);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    setBubbleOpen(false);
  }, [pathname]);

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
    haptic(10);
    setMood("happy");
    window.setTimeout(() => setMood((m) => (m === "happy" ? "normal" : m)), 1400);
    if (bodyRef.current) {
      bodyRef.current.style.transform = "translateY(-10px) scale(1.06)";
      window.setTimeout(() => {
        if (bodyRef.current) bodyRef.current.style.transform = "scale(1, 1)";
      }, 180);
    }
    setBubbleOpen((open) => !open);
  };

  const talk = () => {
    setBubbleOpen(false);
    if (voice.enabled) {
      voice.resume();
      return;
    }
    void navigate({ to: "/patient/assistant" });
  };

  const openChat = () => {
    setBubbleOpen(false);
    void navigate({ to: "/patient/assistant" });
  };

  const onLeft = position.x + BUTTON_SIZE / 2 < (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const faceMood = mood === "happy" ? "normal" : mood;

  return (
    <div
      ref={wrapRef}
      dir="rtl"
      className="fixed z-[99999]"
      style={{
        left: position.x,
        top: position.y,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        transition: dragging ? "none" : `left 520ms ${SPRING}, top 520ms ${SPRING}`,
      }}
    >
      {bubbleOpen && (
        <div
          role="dialog"
          aria-label="نيمو"
          className={`nemo-bubble-in absolute bottom-[calc(100%+10px)] w-56 rounded-2xl border border-border/60 bg-card/85 p-3 text-right text-card-foreground shadow-soft backdrop-blur-xl ${onLeft ? "left-0" : "right-0"}`}
        >
          <p className="text-sm font-bold leading-relaxed">
            أنا معاك يا بطل.. تحب تسألني عن حاجة أو تدردش بصوتك؟
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={talk}
              className="rounded-xl bg-primary px-2 py-2 text-xs font-extrabold text-primary-foreground transition active:scale-95"
            >
              🎙️ تكلّم
            </button>
            <button
              type="button"
              onClick={openChat}
              className="rounded-xl border border-border bg-background/70 px-2 py-2 text-xs font-extrabold transition active:scale-95"
            >
              💬 المحادثة
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onPointerDown={onPointerDown}
        onClick={onClick}
        aria-label={voice.enabled ? "نيمو، استئناف المساعد الصوتي" : "نيمو، رفيقك الصحي"}
        aria-expanded={bubbleOpen}
        title={voice.enabled ? voice.message || "نيمو | المساعد الصوتي" : "نيمو | رفيق الرعاية الصحية"}
        className="group relative grid h-full w-full touch-none place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="sr-only" role="status" aria-live="polite">
          {voice.enabled ? voice.message : ""}
        </span>
        <span
          ref={bodyRef}
          className="relative grid h-full w-full place-items-center rounded-full border border-border/50 bg-card shadow-soft"
          style={{ transition: dragging ? "transform 60ms linear" : `transform 420ms ${SPRING}` }}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-1 rounded-full bg-primary-soft/70 ${mood === "sleepy" ? "" : "motion-safe:animate-pulse"}`}
          />
          <NemoFaceSvg
            happy={mood === "happy"}
            mood={faceMood}
            look={mood === "sleepy" ? { x: 0, y: 0.4 } : look}
            className={`relative z-10 h-10 w-11 ${mood === "sleepy" ? "nemo-sleep" : "nemo-breathe"}`}
          />
          {mood === "sleepy" && (
            <span aria-hidden="true" className="nemo-zzz absolute -top-2 left-0 text-xs font-extrabold text-primary">
              z
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
