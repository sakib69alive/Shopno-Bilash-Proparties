import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlanHighlightLayer } from "@/components/portal/PlanHighlight";
import type { PlanHighlight } from "@/lib/unitPlan";

/**
 * The drawing sheet every floor plan sits on in the owner portal — an
 * architect's sheet in deep midnight blue rather than a bright schoolbook
 * blue: a quiet light pool behind the plan, a hair-fine grid with a slightly
 * stronger line every fifth square, and a vignette that darkens the corners.
 * The sheet belongs to the app, not to the uploaded drawing: a plain line
 * drawing uploaded for a flat becomes fine ivory lines on this sheet (see
 * `BLUEPRINT_LINE_CLASS`/`BLUEPRINT_LINE_STYLE`).
 */
export const BLUEPRINT_PAPER_STYLE: CSSProperties = {
  backgroundColor: "#0d2540",
  backgroundImage: [
    "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(70, 125, 190, 0.40), rgba(70, 125, 190, 0) 70%)",
    "radial-gradient(ellipse 120% 100% at 50% 50%, rgba(0, 0, 0, 0) 55%, rgba(3, 12, 26, 0.55) 100%)",
    "linear-gradient(rgba(190, 215, 245, 0.16) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(190, 215, 245, 0.16) 1px, transparent 1px)",
    "linear-gradient(rgba(190, 215, 245, 0.06) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(190, 215, 245, 0.06) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 80px 80px, 80px 80px, 16px 16px, 16px 16px",
};

/**
 * The plain blue used on the client Home screen when the Blue look is chosen (company default in Settings, or the
 * client's own pick in Profile → Appearance). A single clean blue — no grid, glow or vignette — the same way the Cream
 * look is a single clean cream. The My Property pages keep the deep midnight sheet with its grid above.
 */
export const BLUEPRINT_LIGHT_STYLE: CSSProperties = { backgroundColor: "#1d5aa6" };

/** The Blue-with-grid look: the same blue with a soft light pool and a fine drafting grid (a stronger line every fifth square). */
export const BLUEPRINT_GRID_STYLE: CSSProperties = {
  backgroundColor: "#1d5aa6",
  backgroundImage: [
    "radial-gradient(ellipse 75% 65% at 50% 45%, rgba(120, 175, 235, 0.38), rgba(120, 175, 235, 0) 72%)",
    "linear-gradient(rgba(255, 255, 255, 0.22) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(255, 255, 255, 0.22) 1px, transparent 1px)",
    "linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px)",
    "linear-gradient(90deg, rgba(255, 255, 255, 0.09) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: "100% 100%, 60px 60px, 60px 60px, 12px 12px, 12px 12px",
};
/** Plain white lines for the light sheet. */
export const BLUEPRINT_LIGHT_LINE_STYLE: CSSProperties = { filter: "invert(1)" };

/** Dark lines → ivory, and the drawing's own background drops out into the sheet (see the file comment). */
export const BLUEPRINT_LINE_CLASS = "invert mix-blend-screen";
/** A faint glow so thin lines stay crisp on the dark sheet. Applied after the invert. */
export const BLUEPRINT_LINE_STYLE: CSSProperties = { filter: "invert(1) sepia(0.18) drop-shadow(0 0 0.6px rgba(235, 245, 255, 0.55))" };

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={cn("pointer-events-none absolute size-3 border-[#cfe0f5]/60", className)} />;
}

/**
 * A blueprint shown whole — never cropped — on the sheet, with a generous
 * margin. Give it a size through `className` (an aspect ratio or a height).
 * `title`/`meta` add the small title block architects put at the foot of a
 * sheet ("UNIT A-502 · 1,450 SQFT"). With no plan uploaded it says so on the
 * same sheet instead of showing an empty grey block.
 */
export function BlueprintPaper({
  src,
  alt,
  className,
  title,
  meta,
  emptyText = "Floor plan coming soon",
  highlight,
  highlightLabel,
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  title?: string;
  meta?: string;
  emptyText?: string;
  /** A whole-floor plan with this owner's flat lit up and the others dimmed (see `PlanHighlightLayer`). */
  highlight?: PlanHighlight;
  highlightLabel?: string;
  /** Draw this on the sheet instead of the plain drawing (the interactive room plan) — it fills the sheet's drawing area. */
  children?: ReactNode;
}) {
  return (
    <div style={BLUEPRINT_PAPER_STYLE} className={cn("relative isolate overflow-hidden", className)}>
      {/* Thin frame with crop marks at the corners, like a printed sheet. */}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[3px] border border-[#cfe0f5]/25" />
      <Corner className="top-2 left-2 border-t border-l" />
      <Corner className="top-2 right-2 border-t border-r" />
      <Corner className="bottom-2 left-2 border-b border-l" />
      <Corner className="right-2 bottom-2 border-r border-b" />

      {children ? (
        <div className={cn("absolute top-9 right-9 left-9 flex items-center justify-center [container-type:size]", title ? "bottom-14" : "bottom-9")}>{children}</div>
      ) : src && highlight ? (
        <PlanHighlightLayer
          src={src}
          alt={alt}
          highlight={highlight}
          dim="#0d2540"
          tone="dark"
          label={highlightLabel}
          imgStyle={BLUEPRINT_LINE_STYLE}
          imgClassName="mix-blend-screen"
          className={cn("absolute top-9 right-9 left-9", title ? "bottom-14" : "bottom-9")}
        />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element -- plain img: arbitrary uploaded drawings, shown whole inside the sheet
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={BLUEPRINT_LINE_STYLE}
          className={cn("absolute inset-0 size-full object-contain select-none mix-blend-screen", title ? "p-9 pb-14" : "p-9")}
        />
      ) : (
        <p className="flex h-full items-center justify-center px-10 text-center text-sm tracking-wide text-[#cfe0f5]/80">{emptyText}</p>
      )}

      {title && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 border-t border-[#cfe0f5]/25 px-3 pt-2 pb-1.5 text-[#e8f1fc]">
          <span className="text-[0.6875rem] font-semibold tracking-[0.22em] uppercase">{title}</span>
          {meta && <span className="text-[0.625rem] tracking-[0.16em] text-[#cfe0f5]/75 uppercase">{meta}</span>}
        </div>
      )}
    </div>
  );
}
