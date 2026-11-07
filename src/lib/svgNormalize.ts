/**
 * Makes an uploaded blueprint SVG fit the app's cards, whatever shape it arrives in.
 *
 * A drawing straight from CAD/PDF is often turned sideways (its lettering runs downwards), or sits in a big empty page with wide
 * margins. Dropped in as it is, it would show tiny, turned on its side, in the middle of nowhere — which spoils the screens built
 * around it. So on upload (and in the admin preview, with the same code) the drawing is:
 *
 *   1. ROTATED upright when its own lettering proves it is sideways or upside-down. The direction is read from the order the
 *      letters were drawn in (lettering is drawn in reading order), never guessed from the shape. With no lettering, or no clear
 *      evidence, nothing is rotated — the admin has a rotate button for that case (see `rotateBlueprintSvg`).
 *   2. TRIMMED to its content: the viewBox is tightened to the drawing plus a small margin.
 *
 * Rotation is done with ONE wrapper group carrying `data-bp-matrix`; the room/flat/parking markers stay in their original
 * coordinates inside it, and `lib/planRooms.ts` applies that matrix when it reads them, so markers keep pointing at the right
 * place. A fixed file carries `data-bp-normalized` so running this again changes nothing (idempotent).
 * Pure string work — runs in the browser (admin preview) and on the server (upload).
 */
import { svgAttr, svgShapePoints } from "@/lib/planRooms";

export type Matrix = [number, number, number, number, number, number];

export interface NormalizeResult {
  svg: string;
  /** Plain-language notes on what was fixed ("Turned upright…", "Trimmed empty margins"). Empty when nothing changed. */
  notes: string[];
  /** Degrees turned clockwise (0 when not rotated). */
  rotated: 0 | 90 | -90 | 180;
}

const num = (n: number) => String(Math.round(n * 100) / 100);

function parseViewBox(rootTag: string): [number, number, number, number] | null {
  const m = rootTag.match(/\bviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i);
  if (m) {
    const v = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])] as [number, number, number, number];
    return v[2] > 0 && v[3] > 0 ? v : null;
  }
  const w = parseFloat(svgAttr(rootTag, "width") ?? "");
  const h = parseFloat(svgAttr(rootTag, "height") ?? "");
  return w > 0 && h > 0 ? [0, 0, w, h] : null;
}

function mul(r: Matrix, m: Matrix): Matrix {
  return [
    r[0] * m[0] + r[2] * m[1],
    r[1] * m[0] + r[3] * m[1],
    r[0] * m[2] + r[2] * m[3],
    r[1] * m[2] + r[3] * m[3],
    r[0] * m[4] + r[2] * m[5] + r[4],
    r[1] * m[4] + r[3] * m[5] + r[5],
  ];
}

/** The matrix that turns a rectangle by 90° steps about its own corner, landing it at 0,0. */
function rotationAbout(deg: 90 | -90 | 180, x0: number, y0: number, x1: number, y1: number): Matrix {
  if (deg === 90) return [0, 1, -1, 0, y1, -x0];
  if (deg === -90) return [0, -1, 1, 0, -y0, x1];
  return [-1, 0, 0, -1, x1, y1];
}

function splitRoot(svg: string): { open: string; inner: string; close: string } | null {
  const open = svg.match(/<svg\b[^>]*>/i);
  const closeAt = svg.lastIndexOf("</svg");
  if (!open || open.index === undefined || closeAt < 0) return null;
  const innerStart = open.index + open[0].length;
  return { open: svg.slice(open.index, innerStart), inner: svg.slice(innerStart, closeAt), close: svg.slice(closeAt) };
}

/** Rewrites the opening <svg> tag: new viewBox, no fixed width/height (they would fight the new proportions), and the "already fixed" flag. */
function rewriteRoot(open: string, viewBox: string): string {
  let tag = open.replace(/\s(?:width|height)\s*=\s*("[^"]*"|'[^']*')/gi, "");
  tag = /\bviewBox\s*=/i.test(tag) ? tag.replace(/\bviewBox\s*=\s*("[^"]*"|'[^']*')/i, `viewBox="${viewBox}"`) : tag.replace(/<svg\b/i, `<svg viewBox="${viewBox}"`);
  if (!/\bdata-bp-normalized\b/i.test(tag)) tag = tag.replace(/<svg\b/i, '<svg data-bp-normalized="1"');
  return tag;
}

function matrixOfWrapper(inner: string): { matrix: Matrix; body: string } | null {
  const m = inner.match(/^\s*<g\b[^>]*\bdata-bp-matrix\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*)<\/g>\s*$/i);
  if (!m) return null;
  const v = m[1].trim().split(/[\s,]+/).map(Number);
  return v.length === 6 && v.every(Number.isFinite) ? { matrix: v as Matrix, body: m[2] } : null;
}

function wrap(matrix: Matrix, body: string): string {
  const mtx = matrix.map(num).join(" ");
  return `<g data-bp-matrix="${mtx}" transform="matrix(${mtx})">${body}</g>`;
}

/** Turns an already-fixed (or plain) drawing a further quarter/half turn — for the admin's rotate button. Composes with any earlier rotation. */
export function rotateBlueprintSvg(svg: string, deg: 90 | -90 | 180): string {
  const parts = splitRoot(svg);
  if (!parts) return svg;
  const vb = parseViewBox(parts.open);
  if (!vb) return svg;
  const [vx, vy, vw, vh] = vb;
  const existing = matrixOfWrapper(parts.inner);
  const R = rotationAbout(deg, vx, vy, vx + vw, vy + vh);
  const next = mul(R, existing?.matrix ?? [1, 0, 0, 1, 0, 0]);
  const newVb = deg === 180 ? `0 0 ${num(vw)} ${num(vh)}` : `0 0 ${num(vh)} ${num(vw)}`;
  return rewriteRoot(parts.open, newVb) + wrap(next, existing?.body ?? parts.inner) + parts.close;
}

// ---- Reading the drawing's geometry ----

const SHAPE_TAG = /<(path|polygon|polyline|rect|circle|ellipse|line)\b[^>]*>/gi;
const MARKER_ATTR = /\bdata-(?:room|flat|parking)\s*=/i;

/** Every point a path touches, control points included (a bulging curve must never be cut off by the crop). Also reports each sub-path's box. */
function walkPath(d: string, onSubpath?: (box: [number, number, number, number]) => void): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const all: [number, number][] = [];
  let sub: [number, number, number, number] | null = null;
  const touch = (x: number, y: number) => {
    all.push([x, y]);
    if (!sub) sub = [x, y, x, y];
    else {
      if (x < sub[0]) sub[0] = x;
      if (y < sub[1]) sub[1] = y;
      if (x > sub[2]) sub[2] = x;
      if (y > sub[3]) sub[3] = y;
    }
  };
  const flush = () => {
    if (sub && onSubpath) onSubpath(sub);
    sub = null;
  };
  let x = 0, y = 0, sx = 0, sy = 0, cmd = "", i = 0;
  const next = () => Number(tokens[i++]);
  const more = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") {
      x = sx; y = sy;
      flush();
      continue;
    }
    if (C === "M") {
      flush();
      let first = true;
      while (more()) {
        const nx = next(), ny = next();
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        if (first) { sx = x; sy = y; first = false; }
        touch(x, y);
      }
      cmd = rel ? "l" : "L";
    } else if (C === "L" || C === "T") {
      while (more()) { const nx = next(), ny = next(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; touch(x, y); }
    } else if (C === "H") {
      while (more()) { const nx = next(); x = rel ? x + nx : nx; touch(x, y); }
    } else if (C === "V") {
      while (more()) { const ny = next(); y = rel ? y + ny : ny; touch(x, y); }
    } else {
      const arity = C === "C" ? 6 : C === "S" || C === "Q" ? 4 : C === "A" ? 7 : 0;
      if (!arity) break;
      while (more()) {
        const v: number[] = [];
        for (let k = 0; k < arity; k++) v.push(next());
        if (C === "A") {
          x = rel ? x + v[5] : v[5]; y = rel ? y + v[6] : v[6];
          touch(x, y);
        } else {
          for (let k = 0; k < arity; k += 2) touch(rel ? x + v[k] : v[k], rel ? y + v[k + 1] : v[k + 1]);
          x = rel ? x + v[arity - 2] : v[arity - 2]; y = rel ? y + v[arity - 1] : v[arity - 1];
        }
      }
    }
  }
  flush();
  return all;
}

interface Geometry {
  bbox: [number, number, number, number] | null;
  /** Boxes of the small filled sub-paths, in drawing order — the outlined lettering. */
  glyphs: [number, number, number, number][];
  hasTransform: boolean;
}

function readGeometry(inner: string): Geometry {
  const bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  const glyphs: [number, number, number, number][] = [];
  let any = false;
  const add = (x: number, y: number) => {
    any = true;
    if (x < bbox[0]) bbox[0] = x;
    if (y < bbox[1]) bbox[1] = y;
    if (x > bbox[2]) bbox[2] = x;
    if (y > bbox[3]) bbox[3] = y;
  };
  // A transform we did not write means the coordinates cannot be trusted as they stand.
  const hasTransform = /\stransform\s*=/i.test(inner);

  for (const m of inner.matchAll(SHAPE_TAG)) {
    const tag = m[0];
    if (MARKER_ATTR.test(tag)) continue; // invisible markers never decide how much of the page is "content"
    const name = m[1].toLowerCase();
    const fill = (svgAttr(tag, "fill") ?? "").trim().toLowerCase();
    const filled = fill !== "" && fill !== "none" && fill !== "transparent";
    if (name === "path") {
      const pts = walkPath(svgAttr(tag, "d") ?? "", filled ? (b) => glyphs.push(b) : undefined);
      for (const [x, y] of pts) add(x, y);
    } else if (name === "line") {
      add(parseFloat(svgAttr(tag, "x1") ?? "0"), parseFloat(svgAttr(tag, "y1") ?? "0"));
      add(parseFloat(svgAttr(tag, "x2") ?? "0"), parseFloat(svgAttr(tag, "y2") ?? "0"));
    } else {
      for (const [x, y] of svgShapePoints(tag, name)) add(x, y);
    }
  }
  return { bbox: any ? bbox : null, glyphs, hasTransform };
}

/**
 * Which way is the lettering running? Letters are drawn in reading order, so a word is a run of neighbouring letters stepping the
 * same way: eastwards for upright text, southwards for text turned a quarter turn clockwise, northwards for anticlockwise, westwards
 * for upside-down. Each run votes with its length; a clear winner decides (south → turn back −90, north → +90, west → 180).
 * Upright text, mixed directions (a few vertical dimensions), too few letters, or no clear winner → 0: nothing is rotated.
 */
function lettersFix(glyphs: [number, number, number, number][], contentSize: number): 0 | 90 | -90 | 180 {
  const lo = contentSize * 0.0015;
  const hi = contentSize * 0.03;
  // Letter-shaped boxes only: not tiny specks, not long thin bars (hatching, table edges), not big shapes.
  const boxes = glyphs.filter((b) => {
    const w = b[2] - b[0], h = b[3] - b[1];
    const s = Math.max(w, h);
    return s >= lo && s <= hi && Math.min(w, h) / s >= 0.08;
  });
  if (boxes.length < 40) return 0;

  const votes = { east: 0, south: 0, west: 0, north: 0 };
  let run: { n: number; x0: number; y0: number; x1: number; y1: number; size: number; last: [number, number, number, number] } | null = null;
  const close = () => {
    if (run && run.n >= 3) {
      const dx = run.x1 - run.x0, dy = run.y1 - run.y0;
      if (Math.hypot(dx, dy) >= run.size * 1.5) {
        if (Math.abs(dx) >= Math.abs(dy) * 2) votes[dx > 0 ? "east" : "west"] += run.n;
        else if (Math.abs(dy) >= Math.abs(dx) * 2) votes[dy > 0 ? "south" : "north"] += run.n;
      }
    }
    run = null;
  };
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    const sz = Math.max(b[2] - b[0], b[3] - b[1]);
    if (run) {
      // A hole inside the letter just drawn (the counter of an "e", "o", "B") is part of that letter, not a new one.
      const L = run.last;
      if (cx >= L[0] && cx <= L[2] && cy >= L[1] && cy <= L[3]) continue;
      const dx = cx - run.x1, dy = cy - run.y1;
      const dist = Math.hypot(dx, dy);
      const ref = Math.max(sz, run.size);
      const alike = Math.max(sz, run.size) / Math.min(sz, run.size) <= 3;
      // keeps going the way the run already runs (within ~45°) and stays one letter-width away
      const rdx = run.x1 - run.x0, rdy = run.y1 - run.y0;
      const rlen = Math.hypot(rdx, rdy);
      const aligned = run.n < 2 || rlen === 0 || (dx * rdx + dy * rdy) / (dist * rlen) > 0.7;
      if (dist >= ref * 0.12 && dist <= ref * 1.9 && alike && aligned) {
        run.n++;
        run.x1 = cx;
        run.y1 = cy;
        run.size = Math.max(run.size, sz);
        run.last = b;
        continue;
      }
      close();
    }
    run = { n: 1, x0: cx, y0: cy, x1: cx, y1: cy, size: sz, last: b };
  }
  close();

  const total = votes.east + votes.south + votes.west + votes.north;
  if (process.env.BP_DEBUG) console.log("letters", { boxes: boxes.length, ...votes });
  if (total < 60) return 0;
  const ranked = (Object.entries(votes) as [keyof typeof votes, number][]).sort((a, b) => b[1] - a[1]);
  const [top, topVotes] = ranked[0];
  const second = ranked[1][1];
  // A clear winner: at least 55% of all lettering AND well ahead of the runner-up.
  if (topVotes < total * 0.55 || topVotes < second * 1.8) return 0;
  return top === "south" ? -90 : top === "north" ? 90 : top === "west" ? 180 : 0;
}

const ROTATION_NOTE: Record<number, string> = {
  [-90]: "Turned upright (a quarter turn anticlockwise) — its lettering ran downwards.",
  90: "Turned upright (a quarter turn clockwise) — its lettering ran upwards.",
  180: "Turned upright (half a turn) — its lettering was upside down.",
};

/** The automatic fix. Safe to call on anything: a file it cannot understand comes back untouched. */
export function normalizeBlueprintSvg(input: string): NormalizeResult {
  const untouched: NormalizeResult = { svg: input, notes: [], rotated: 0 };
  if (/\bdata-bp-normalized\b/i.test(input)) return untouched;
  const parts = splitRoot(input);
  if (!parts) return untouched;
  const vb = parseViewBox(parts.open);
  if (!vb) return untouched;

  const geo = readGeometry(parts.inner);
  if (!geo.bbox || geo.hasTransform) return untouched; // nothing to measure, or coordinates we cannot trust

  const [vx, vy, vw, vh] = vb;
  let [x0, y0, x1, y1] = geo.bbox;
  // Stay inside the original canvas, then add a margin so the outermost lines are never touching the edge.
  const pad = Math.max(vw, vh) * 0.004 + Math.max(x1 - x0, y1 - y0) * 0.012;
  x0 = Math.max(vx, x0 - pad); y0 = Math.max(vy, y0 - pad);
  x1 = Math.min(vx + vw, x1 + pad); y1 = Math.min(vy + vh, y1 + pad);
  const bw = x1 - x0, bh = y1 - y0;
  if (!(bw > 0 && bh > 0)) return untouched;

  const rotate = lettersFix(geo.glyphs, Math.max(bw, bh));
  const emptyMargin = (bw * bh) / (vw * vh) < 0.9;
  if (rotate === 0 && !emptyMargin) return untouched;

  const notes: string[] = [];
  if (rotate !== 0) notes.push(ROTATION_NOTE[rotate]);
  if (emptyMargin) notes.push("Trimmed the empty margins around the drawing.");

  if (rotate === 0) {
    const open = rewriteRoot(parts.open, `${num(x0)} ${num(y0)} ${num(bw)} ${num(bh)}`);
    return { svg: open + parts.inner + parts.close, notes, rotated: 0 };
  }
  const M = rotationAbout(rotate, x0, y0, x1, y1);
  const newVb = rotate === 180 ? `0 0 ${num(bw)} ${num(bh)}` : `0 0 ${num(bh)} ${num(bw)}`;
  return { svg: rewriteRoot(parts.open, newVb) + wrap(M, parts.inner) + parts.close, notes, rotated: rotate };
}
