/**
 * The rules a floor-plan SVG must follow to look right — and stay light — on the phone's blue blueprint sheet.
 * One pure module, used in three places so they can never disagree: the admin "Blueprint AI" checker (in the
 * browser), the upload guard (on the server, before a plan is saved), and the master prompt the admin hands to an AI
 * (its numbers are read from `BLUEPRINT_SVG_LIMITS`).
 *
 * Why the rules exist: the portal turns a plan into white lines on blue with a CSS invert + blend, and lets people
 * pinch-zoom it. A drawing that leans on filters, masks, gradients, embedded pictures, web fonts or thousands of tiny
 * shapes makes some Android phones paint torn, noisy blocks and lag. A plain stroke-only drawing never does.
 */

export const BLUEPRINT_SVG_LIMITS = {
  /** Above this the plan is refused. A hand-drawn flat is 10–60 KB; a faithful copy of an architect's drawing with its lettering is 100–800 KB. */
  maxBytes: 1024 * 1024,
  /** Above this the plan is refused. */
  maxElements: 1500,
  /** Above this the checker warns — the master prompt asks the AI to stay under it. */
  recommendedElements: 450,
  recommendedBytes: 400 * 1024,
  /** Lettering (room names, sizes) is allowed as ONE filled path of outlined glyphs — never <text>. A second filled path covers solid details (columns, hatching). */
  maxFilledPaths: 2,
  /** The one ink colour the prompt asks for (the portal recolours it to white). */
  ink: "#1c1b19",
  /** Longest side of the canvas the prompt asks for. */
  canvas: 1000,
} as const;

import { extractAreasFromSvg, extractRoomsFromSvg } from "@/lib/planRooms";
import { normalizeBlueprintSvg } from "@/lib/svgNormalize";

/** Elements that make a plan heavy or unsafe to paint — an upload containing any of these is refused. */
const FORBIDDEN_TAGS: Record<string, string> = {
  filter: "a filter (blur, shadow, glow)",
  mask: "a mask",
  pattern: "a pattern fill",
  lineargradient: "a gradient",
  radialgradient: "a gradient",
  image: "an embedded picture",
  style: "a <style> block",
};

/** Elements allowed to exist without counting as "shapes". */
const NON_SHAPE_TAGS = new Set(["svg", "g", "defs", "title", "desc", "metadata"]);

export interface BlueprintSvgReport {
  /** False when something would be refused on upload. */
  ok: boolean;
  /** Reasons the upload is refused. */
  errors: string[];
  /** Things that still work but make the plan heavier or less faithful. */
  warnings: string[];
  stats: { bytes: number; elements: number; paths: number; hasViewBox: boolean };
  /** Rooms found from `data-room` markers — they become the room buttons on the public site. */
  rooms: { label: string; type: string }[];
  /** Flats and parking bays found from `data-flat` / `data-parking` markers on a whole-floor drawing. */
  areas: { kind: "flat" | "parking"; key: string }[];
  /** What the upload will fix on its own (turn it upright, trim empty margins) — the file does not need to be fixed by hand first. */
  fixes: string[];
}

function tagCounts(svg: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of svg.matchAll(/<([a-zA-Z][\w:-]*)/g)) {
    const tag = match[1].toLowerCase();
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

/** Checks an SVG's text against the blueprint rules. Pure — safe to call in the browser and on the server. */
export function checkBlueprintSvg(input: string): BlueprintSvgReport {
  const svg = input.replace(/^﻿/, "").trim();
  const errors: string[] = [];
  const warnings: string[] = [];
  const bytes = new TextEncoder().encode(svg).length;
  const counts = tagCounts(svg);
  const elements = [...counts.entries()].filter(([tag]) => !NON_SHAPE_TAGS.has(tag)).reduce((sum, [, n]) => sum + n, 0);
  const hasViewBox = /<svg\b[^>]*\bviewBox\s*=\s*["'][^"']+["']/i.test(svg);
  const stats = { bytes, elements, paths: counts.get("path") ?? 0, hasViewBox };

  if (!/^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[\s\S]*?>\s*)?<svg[\s>]/i.test(svg)) {
    return { ok: false, errors: ["This isn't an SVG file — it must start with an <svg> tag."], warnings, stats, rooms: [], areas: [], fixes: [] };
  }

  if (!hasViewBox) errors.push('The <svg> tag has no viewBox (for example viewBox="0 0 760 1010") — without it the plan cannot be fitted to the card.');
  if (bytes > BLUEPRINT_SVG_LIMITS.maxBytes) errors.push(`The file is ${Math.round(bytes / 1024)} KB — the limit is ${BLUEPRINT_SVG_LIMITS.maxBytes / 1024} KB. Ask the AI to merge shapes into fewer paths.`);
  if (elements > BLUEPRINT_SVG_LIMITS.maxElements) errors.push(`${elements} shapes — the limit is ${BLUEPRINT_SVG_LIMITS.maxElements}. Ask the AI to merge lines into a few <path> elements.`);

  for (const [tag, label] of Object.entries(FORBIDDEN_TAGS)) {
    if (counts.has(tag)) errors.push(`Contains ${label} (<${tag}>) — not allowed, it makes some phones paint the plan torn and slow.`);
  }
  if ([...counts.keys()].some((t) => t.startsWith("fe"))) errors.push("Contains filter effects (<fe…>) — not allowed.");
  if (/\bmix-blend-mode\b|\bbackdrop-filter\b|\bfilter\s*[:=]/i.test(svg)) errors.push("Uses a CSS filter or blend mode — not allowed.");
  if (/\bclass\s*=/.test(svg) && counts.has("style")) errors.push("Relies on CSS classes — put stroke, fill and widths directly on each element.");
  if (/data:image\//i.test(svg)) errors.push("Contains an embedded picture (base64) — a plan must be pure line art.");

  if (counts.has("text") || counts.has("tspan")) warnings.push("Contains <text> — fonts differ from phone to phone and can render blurry or in the wrong place. Convert lettering to outlined glyph shapes inside one filled <path> instead (or leave labels out for a simple flat plan).");
  if (counts.has("clippath")) warnings.push("Contains a clipPath — avoid it; redraw the shape so no clipping is needed.");
  if (counts.has("use") || counts.has("symbol")) warnings.push("Contains <use>/<symbol> — draw every shape out in full instead.");
  if (elements > BLUEPRINT_SVG_LIMITS.recommendedElements && elements <= BLUEPRINT_SVG_LIMITS.maxElements) {
    warnings.push(`${elements} shapes — works, but under ${BLUEPRINT_SVG_LIMITS.recommendedElements} is lighter and smoother. Merging lines of the same width into one <path> is the easy win.`);
  }
  if (bytes > BLUEPRINT_SVG_LIMITS.recommendedBytes && bytes <= BLUEPRINT_SVG_LIMITS.maxBytes) {
    warnings.push(`${Math.round(bytes / 1024)} KB — works, but under ${BLUEPRINT_SVG_LIMITS.recommendedBytes / 1024} KB loads faster.`);
  }
  if (/(?:stroke|fill)\s*[=:]\s*["']?\s*(?:#fff(?:fff)?\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i.test(svg)) {
    warnings.push("Paints something white — white is used to fake gaps in walls. Leave real gaps in the wall lines instead, so the plan stays truly transparent.");
  }
  if (/<rect\b[^>]*\bwidth\s*=\s*["']?100%/i.test(svg) || /<rect\b[^>]*\b(?:x|y)\s*=\s*["']?0["']?[^>]*\bwidth\s*=\s*["']?(?:760|1000|800|1024)["']?[^>]*\bfill\s*=\s*["']?(?!none)/i.test(svg)) {
    warnings.push("Looks like it has a background rectangle — remove it; the app supplies the blue sheet.");
  }
  const filled = (svg.match(/\bfill\s*=\s*["'](?!none["'])[^"']+["']/gi) ?? []).length;
  if (filled > BLUEPRINT_SVG_LIMITS.maxFilledPaths) {
    warnings.push(
      `${filled} filled shapes — plans should be outlines (fill="none"). The only fills allowed are ONE path of outlined lettering and one for solid details (columns, hatching); anything else turns into solid white blocks on the blue sheet.`,
    );
  }
  if (/\bopacity\s*=/.test(svg)) warnings.push("Uses opacity — avoid it; semi-transparent layers are costly to paint.");

  const found = hasViewBox ? extractRoomsFromSvg(svg) : null;
  const markerCount = (svg.match(/data-rooms*=/gi) ?? []).length;
  if (markerCount > 0 && !found) warnings.push("Has data-room markers, but none could be read — markers must be <polygon> or <rect> (or a straight-line <path>) with at least 3 points, inside the viewBox, with no transform.");
  else if (found && markerCount > found.rooms.length) warnings.push(`${markerCount - found.rooms.length} room marker(s) could not be read and were skipped — use <polygon points=\"…\"> or <rect>.`);
  const fixes = hasViewBox ? normalizeBlueprintSvg(svg).notes : [];
  return { ok: errors.length === 0, errors, warnings, stats, fixes, rooms: (found?.rooms ?? []).map((r) => ({ label: r.label, type: r.type })), areas: (hasViewBox ? extractAreasFromSvg(svg)?.areas ?? [] : []).map((a) => ({ kind: a.kind, key: a.key })) };
}
