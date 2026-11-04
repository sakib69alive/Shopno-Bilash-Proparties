"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Public site only — momentum/inertia scrolling (a short wheel flick keeps
 * gliding and settles with easing, instead of the browser's default
 * scroll-then-instant-stop). Mounted once in the `(public)` layout;
 * Admin/Portal deliberately don't get this (dense data tables and their
 * own internal scroll containers don't want the page itself hijacking the
 * wheel). Renders nothing — a pure side-effect that wires the whole
 * document's scrolling to Lenis for as long as this route group is mounted.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Touch devices already have native momentum scrolling; Lenis on top of it
    // only adds latency and fights the browser's own gestures.
    if (window.matchMedia("(pointer: coarse), (max-width: 1023.98px)").matches) return;

    // `autoRaf: true` lets Lenis drive its own internal rAF loop instead of
    // a second, separate one here — two independent per-frame loops (this
    // one plus Header's own scroll-position rAF) was doing duplicate work
    // and was part of what made scrolling feel glitchy/low-fps. A shorter
    // `duration` also matters more than it looks: it's the window (in
    // seconds) every wheel flick keeps recomputing scroll position and
    // repainting the fixed header's frosted background for — shorter means
    // less sustained per-frame work per gesture, not just a snappier feel.
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      touchMultiplier: 1.4,
      autoRaf: true,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  return null;
}
