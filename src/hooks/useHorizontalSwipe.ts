"use client";

import { useEffect, useRef } from "react";

/**
 * Phone-only left/right swipe anywhere on the page. `onSwipe(1)` = swipe left (go to the NEXT thing),
 * `onSwipe(-1)` = swipe right (go to the PREVIOUS thing). Shared by the bottom-tab navigation and the
 * Founder page's tabs so both behave identically.
 *
 * It stays out of the way of real content: ignored when the finger starts on something that pans sideways
 * by itself (photo strips, floor plans, tab rails), on a form field, within 16px of a screen edge (the
 * phone's own back gesture), while a sheet is open, or on a pinch. `data-no-swipe` opts any element out.
 *
 * A real thumb swipe is rarely clean, so the rules are forgiving: ~56px sideways, mostly horizontal,
 * within 1.1s — and a gesture the browser cancels halfway (because it began scrolling) still counts if it
 * had clearly gone sideways first.
 */
export function useHorizontalSwipe(onSwipe: (direction: 1 | -1) => void, enabled = true) {
  // Always call the latest handler without re-binding the listeners on every render.
  const handler = useRef(onSwipe);
  useEffect(() => {
    handler.current = onSwipe;
  });

  useEffect(() => {
    if (!enabled) return;

    let start: { x: number; y: number; t: number } | null = null;
    let last: { x: number; y: number } | null = null;

    function blocked(target: EventTarget | null): boolean {
      if (document.body.style.position === "fixed") return true; // a bottom sheet / dialog is open
      for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.matches?.("input, textarea, select, [contenteditable], [data-no-swipe]")) return true;
        const style = getComputedStyle(el);
        if (style.touchAction !== "auto" && style.touchAction !== "manipulation") return true; // pan/zoom areas
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2) return true;
      }
      return false;
    }

    function onStart(e: TouchEvent) {
      start = null;
      last = null;
      if (e.touches.length !== 1 || !window.matchMedia("(max-width: 1023.98px)").matches) return;
      const t = e.touches[0];
      if (t.clientX < 16 || t.clientX > window.innerWidth - 16) return;
      if (blocked(e.target)) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
      last = { x: t.clientX, y: t.clientY };
    }
    function onMove(e: TouchEvent) {
      if (e.touches.length > 1) {
        start = null; // a pinch, not a swipe
        return;
      }
      const t = e.touches[0];
      if (t && last) last = { x: t.clientX, y: t.clientY };
    }
    function finish(end: { x: number; y: number } | null) {
      if (!start) return;
      const from = start;
      start = null;
      if (!end) return;
      const dx = end.x - from.x;
      const dy = end.y - from.y;
      if (Date.now() - from.t > 1100) return;
      if (Math.abs(dx) < 56 || Math.abs(dy) > Math.abs(dx) * 0.7) return;
      handler.current(dx < 0 ? 1 : -1);
    }
    function onEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      finish(t ? { x: t.clientX, y: t.clientY } : last);
    }
    function onCancel() {
      finish(last);
    }

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [enabled]);
}
