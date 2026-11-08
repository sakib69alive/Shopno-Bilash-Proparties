"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_SCALE = 5;

/**
 * Pinch-to-zoom for a drawing, without zooming the whole page.
 *
 * The drawing is laid out BIGGER (its box grows to `scale × 100%`) inside a box that scrolls, instead of being stretched with a CSS
 * transform — so the browser draws the lines and lettering again at the new size and they stay sharp however far you zoom. Two fingers
 * zoom around the point between them, one finger moves the drawing, double-tap toggles a close-up, and the +/− buttons (and Ctrl + wheel)
 * do the same on a computer.
 *
 * It tells the page-swipe gesture to stay out (`data-no-swipe`, a pan touch-action, and no bubbling of its touches while zoomed in), so
 * moving around a zoomed plan never flips the page. Give it a size through `className`; the children fill it (`h-full w-full`).
 */
export function ZoomPan({
  children,
  className,
  controls = true,
  extraControls,
  max = MAX_SCALE,
  label = "Floor plan",
}: {
  children: ReactNode;
  className?: string;
  /** The small + / − buttons. Off for a card that sits inside a button (pinch still works). */
  controls?: boolean;
  /** Extra round buttons shown just left of the zoom buttons (e.g. a rotate button). */
  extraControls?: ReactNode;
  max?: number;
  label?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  // The point of the drawing (in the box's own 0..1 units) that must stay under the focal point after a zoom.
  const pending = useRef<{ cx: number; cy: number; fx: number; fy: number } | null>(null);
  const lastTap = useRef(0);
  const inner = useRef<HTMLDivElement>(null);
  // A touch session that ever had two fingers is a pinch, never a tap — lifting two fingers must not count as a double-tap.
  const multi = useRef(false);
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const zoomTo = useCallback(
    (next: number, focal?: { x: number; y: number }) => {
      const el = scroller.current;
      if (!el) return;
      const target = Math.min(max, Math.max(1, next));
      const prev = scaleRef.current;
      if (Math.abs(target - prev) < 0.001) return;
      const rect = el.getBoundingClientRect();
      const fx = focal ? focal.x - rect.left : rect.width / 2;
      const fy = focal ? focal.y - rect.top : rect.height / 2;
      pending.current = {
        cx: (el.scrollLeft + fx) / (rect.width * prev),
        cy: (el.scrollTop + fy) / (rect.height * prev),
        fx,
        fy,
      };
      scaleRef.current = target;
      setScale(target);
    },
    [max],
  );

  // After the bigger box is laid out, put the pinched point back under the fingers.
  useLayoutEffect(() => {
    const el = scroller.current;
    const p = pending.current;
    if (!el || !p) return;
    pending.current = null;
    const rect = el.getBoundingClientRect();
    el.scrollLeft = p.cx * rect.width * scale - p.fx;
    el.scrollTop = p.cy * rect.height * scale - p.fy;
  }, [scale]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let startDist = 0;
    let startScale = 1;
    // While two fingers are down the drawing is only scaled with a transform (smooth, no re-layout); it is laid out for real when they lift.
    let live: { target: number; fx: number; fy: number } | null = null;

    const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const mid = (e: TouchEvent) => ({ x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 });

    function onStart(e: TouchEvent) {
      if (e.touches.length >= 2) multi.current = true;
      if (e.touches.length === 2) {
        startDist = dist(e);
        startScale = scaleRef.current;
      }
    }
    function onMove(e: TouchEvent) {
      if (e.touches.length !== 2 || startDist === 0) return;
      e.preventDefault(); // our pinch, not the browser's page zoom
      const box = el!.getBoundingClientRect();
      const m = mid(e);
      const target = Math.min(max, Math.max(1, startScale * (dist(e) / startDist)));
      const fx = m.x - box.left;
      const fy = m.y - box.top;
      live = { target, fx, fy };
      const node = inner.current;
      if (node) {
        node.style.transformOrigin = `${el!.scrollLeft + fx}px ${el!.scrollTop + fy}px`;
        node.style.transform = `scale(${target / startScale})`;
      }
    }
    function onEnd(e: TouchEvent) {
      if (e.touches.length < 2 && startDist !== 0) {
        startDist = 0;
        const node = inner.current;
        if (node) {
          node.style.transform = "";
          node.style.transformOrigin = "";
        }
        if (live) {
          const box = el!.getBoundingClientRect();
          zoomTo(live.target, { x: box.left + live.fx, y: box.top + live.fy });
          live = null;
        }
      }
    }
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomTo(scaleRef.current * Math.exp(-e.deltaY / 200), { x: e.clientX, y: e.clientY });
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [zoomTo]);

  // A zoomed-in plan owns its touches: a viewer behind it (the photo carousel) must not take a swipe as "next".
  const onTouchStartTap = (e: React.TouchEvent) => {
    if (e.touches.length === 1) tapStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    keepTouches(e);
  };
  const keepTouches = (e: React.TouchEvent) => {
    if (scaleRef.current > 1.001 || e.touches.length > 1) e.stopPropagation();
  };

  function onDoubleTap(e: React.TouchEvent) {
    const wasMulti = multi.current;
    if (e.touches.length === 0) multi.current = false;
    const start = tapStart.current;
    if (e.touches.length === 0) tapStart.current = null;
    if (!controls || wasMulti || !start || e.changedTouches.length !== 1) {
      lastTap.current = 0;
      return;
    }
    const now = Date.now();
    const t = e.changedTouches[0];
    // only a quick, still tap counts
    if (now - start.t > 280 || Math.hypot(t.clientX - start.x, t.clientY - start.y) > 12) {
      lastTap.current = 0;
      return;
    }
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      zoomTo(scaleRef.current > 1.05 ? 1 : 2.5, { x: t.clientX, y: t.clientY });
    } else {
      lastTap.current = now;
    }
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        ref={scroller}
        data-no-swipe
        role="group"
        aria-label={`${label} — pinch to zoom`}
        onTouchStart={onTouchStartTap}
        onTouchMove={keepTouches}
        onTouchEnd={(e) => {
          keepTouches(e);
          onDoubleTap(e);
        }}
        style={{ touchAction: "pan-x pan-y" }}
        className="no-scrollbar absolute inset-0 overflow-auto overscroll-contain"
      >
        <div ref={inner} style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}>
          {children}
        </div>
      </div>
      {controls && (
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
          {extraControls}
          {scale > 1.01 && (
            <button
              type="button"
              onClick={() => zoomTo(1)}
              className="flex h-9 items-center rounded-full bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur transition-transform active:scale-90"
            >
              {Math.round(scale * 100)}% · Reset
            </button>
          )}
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomTo(scaleRef.current / 1.5)}
            disabled={scale <= 1.01}
            className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform active:scale-90 disabled:opacity-40"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomTo(scaleRef.current * 1.5)}
            disabled={scale >= max - 0.01}
            className="flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-transform active:scale-90 disabled:opacity-40"
          >
            <Plus aria-hidden className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
