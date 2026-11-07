import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { PlanHighlight } from "@/lib/unitPlan";
import { planViewTransform } from "@/lib/planRooms";
import type { FlatArea } from "@/types/project";

/**
 * A whole-floor plan with ONE flat lit up: the owner's own flat gets a soft glow and an outline, every other flat is veiled in
 * the sheet's own colour (so their lines fade but stay readable) and the shared parts — lift, stair, lobby — stay as drawn.
 *
 * Alignment is exact on any screen: the drawing sits in a box that has the plan's own width ÷ height, sized to the largest such
 * box that fits (container-query units), and the polygons are drawn in that same box as 0–100 percentages. Position the layer
 * with `className` (it must be `absolute`-positioned with an `inset-*`); it fills that area and centres the plan in it.
 */
const TONES = {
  /** Dark / blue sheets: warm amber glow. */
  dark: { fill: "rgb(255 214 120 / 0.2)", stroke: "#ffd678", chipBg: "#ffd678", chipText: "#10325b" },
  /** Cream paper: deep green. */
  light: { fill: "rgb(31 61 51 / 0.14)", stroke: "#1f3d33", chipBg: "#1f3d33", chipText: "#ffffff" },
} as const;

function pathOf(areas: FlatArea[]): string {
  return areas
    .filter((a) => a.points.length >= 3)
    .map((a) => `M${a.points.map(([x, y]) => `${+(x * 100).toFixed(2)} ${+(y * 100).toFixed(2)}`).join("L")}Z`)
    .join("");
}

function centroid(area: FlatArea): [number, number] {
  const n = area.points.length || 1;
  return [area.points.reduce((s, p) => s + p[0], 0) / n, area.points.reduce((s, p) => s + p[1], 0) / n];
}

export function PlanHighlightLayer({
  src,
  alt,
  highlight,
  dim,
  tone = "dark",
  label,
  focus = false,
  only = false,
  className,
  imgClassName,
  imgStyle,
}: {
  src: string;
  alt: string;
  highlight: PlanHighlight;
  /** The sheet's colour, used to veil the other flats. */
  dim: string;
  tone?: keyof typeof TONES;
  /** A small tag on the owner's flat, e.g. "Your flat". Leave out on thumbnails. */
  label?: string;
  /** Zoom in so the owner's own flat fills the area (the rest of the floor runs off the edges). Used on the small Home card. */
  focus?: boolean;
  /** Show ONLY the owner's own flat — everything else on the floor is cut away, as if the flat had its own drawing (used on the Home screen). */
  only?: boolean;
  className?: string;
  imgClassName?: string;
  imgStyle?: CSSProperties;
}) {
  const t = TONES[tone];
  const { aspect } = highlight;
  const mineD = pathOf(highlight.mine);
  const othersD = pathOf(highlight.others);
  const [cx, cy] = highlight.mine[0] ? centroid(highlight.mine[0]) : [0.5, 0.5];

  // "Only" mode: the drawing is clipped to the flat's outline (grown a hair so a slightly tight outline never shaves a wall).
  let onlyClip: string | undefined;
  if (only && highlight.mine[0]) {
    const pts = highlight.mine[0].points.map(([x, y]) => [Math.min(1, Math.max(0, cx + (x - cx) * 1.035)), Math.min(1, Math.max(0, cy + (y - cy) * 1.035))]);
    onlyClip = `polygon(${pts.map(([x, y]) => `${+(x * 100).toFixed(2)}% ${+(y * 100).toFixed(2)}%`).join(", ")})`;
  }

  // Focus: the box is made big enough that the flat's bounding box (plus a margin) just fits the area, then shifted so the flat sits in the middle.
  let boxStyle: CSSProperties = { width: `min(100cqw, calc(100cqh * ${aspect}))`, height: `min(100cqh, calc(100cqw / ${aspect}))` };
  if (focus && highlight.mine.length > 0) {
    const xs = highlight.mine.flatMap((a) => a.points.map((p) => p[0]));
    const ys = highlight.mine.flatMap((a) => a.points.map((p) => p[1]));
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = only ? 1.07 : 1.2;
    const fx = Math.max(0.08, (x1 - x0) * pad);
    const fy = Math.max(0.08, (y1 - y0) * pad);
    const w = `min(calc(100cqw / ${fx.toFixed(4)}), calc(100cqh * ${aspect} / ${fy.toFixed(4)}))`;
    boxStyle = {
      ["--plan-w" as string]: w,
      position: "absolute",
      width: "var(--plan-w)",
      aspectRatio: String(aspect),
      left: `calc(50% - var(--plan-w) * ${((x0 + x1) / 2).toFixed(4)})`,
      top: `calc(50% - var(--plan-w) / ${aspect} * ${((y0 + y1) / 2).toFixed(4)})`,
    };
  }
  // The admin's own tilt / zoom / shift of the whole-floor plan (client app); a framed or flat-only view keeps just the tilt.
  const viewTransform = planViewTransform(highlight.view, aspect, focus || only);
  const inner = (
        <div className={focus ? undefined : "relative"} style={viewTransform && !focus ? { ...boxStyle, transform: viewTransform } : boxStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element -- plain img: arbitrary uploaded drawing, laid exactly under the highlight */}
          <img src={src} alt={alt} draggable={false} style={onlyClip ? { ...imgStyle, clipPath: onlyClip } : imgStyle} className={cn("absolute inset-0 size-full object-contain select-none", imgClassName)} />
          {!only && <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
            {othersD && <path d={othersD} fill={dim} fillOpacity={0.66} />}
            {mineD && <path d={mineD} fill={t.fill} stroke={t.stroke} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </svg>}
          {label && mineD && !only && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[0.625rem] leading-none font-semibold tracking-[0.12em] whitespace-nowrap uppercase shadow-sm"
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, backgroundColor: t.chipBg, color: t.chipText }}
            >
              {label}
            </span>
          )}
        </div>
  );
  return (
    <div className={cn("[container-type:size]", focus && "overflow-hidden", className)}>
      {focus ? inner : <div className="flex size-full items-center justify-center">{inner}</div>}
    </div>
  );
}
