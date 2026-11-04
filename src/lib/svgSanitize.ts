/**
 * Cleans an uploaded SVG so it is safe to serve from this site's own address.
 * A blueprint SVG is only ever a drawing — paths, lines, text, shapes — so
 * anything that can run code or reach out is removed: <script>, <foreignObject>,
 * <iframe>/<object>/<embed>, <animate>/<set> that rewrite links, event
 * attributes (onclick…), javascript:/data:text links, DOCTYPE/ENTITY tricks and
 * references to other websites. What is left still draws exactly the same.
 * Returns null when the text is not an SVG at all.
 */
export function sanitizeSvg(input: string): string | null {
  let svg = input.replace(/^﻿/, "").trim();

  // XML prolog / comments / DOCTYPE & ENTITY declarations (XXE and "billion laughs" tricks).
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/gi, "").replace(/<!ENTITY[\s\S]*?>/gi, "");
  svg = svg.trim();

  if (!/^<svg[\s>]/i.test(svg)) return null;

  // Elements that can execute or embed foreign content: drop them with everything inside.
  for (const tag of ["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "canvas", "animate", "animateTransform", "animateMotion", "set", "handler", "listener"]) {
    svg = svg.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(</${tag}\\s*>|/>)`, "gi"), "");
    svg = svg.replace(new RegExp(`<${tag}\\b[^>]*>`, "gi"), "");
  }

  // Event handler attributes (onclick="…", onload='…', onfoo=bar).
  svg = svg.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Links: only in-document references (#id) and embedded raster images survive.
  svg = svg.replace(/\s((?:xlink:)?href)\s*=\s*("([^"]*)"|'([^']*)')/gi, (whole, _attr, _quoted, dq?: string, sq?: string) => {
    const value = (dq ?? sq ?? "").trim();
    return value.startsWith("#") || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value) ? whole : "";
  });

  // url(...) in styles/attributes may point at other sites; keep only url(#id).
  svg = svg.replace(/url\(\s*(['"]?)(?!#)[^)]*\1\s*\)/gi, "none");
  svg = svg.replace(/@import[^;]*;?/gi, "");
  svg = svg.replace(/javascript:/gi, "");

  return svg.includes("</svg") ? svg : null;
}
