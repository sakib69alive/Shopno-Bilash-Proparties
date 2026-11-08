/**
 * Rooms on a floor plan — the part that lets a visitor press "Kitchen" and see the kitchen lift off the plan.
 *
 * Every room is a closed polygon whose points are 0–1 fractions of the drawing's width/height (so it fits any screen), a label
 * ("Master bedroom") and a type (bedroom, kitchen, balcony…) that drives the buttons and the counts ("3 bedrooms · 2 balconies").
 *
 * Rooms get here two ways: an admin marks them by hand on the plan (Admin → the project/unit → blueprint), or the SVG itself
 * carries room markers — `<polygon data-room="Kitchen" data-room-type="kitchen" points="…" fill="none" stroke="none"/>` — which
 * `extractRoomsFromSvg` reads the moment the file is chosen/uploaded. The AI prompt on Admin → Settings → Blueprint AI tells an AI
 * to add exactly those markers, so an AI-made plan connects to the buttons without anyone drawing anything.
 *
 * Pure functions only — runs in the browser (admin editor, checker) and on the server (upload).
 */

/**
 * Kinds of marked area. A flat's plan has rooms (bedroom, kitchen, bathroom, balcony, servant room…); a drawing of a whole building floor
 * has flats, lifts, stairs and lobbies. Both use the same shapes and the same animation.
 */
export const ROOM_TYPES = ["flat", "bedroom", "living", "dining", "kitchen", "bathroom", "balcony", "servant", "store", "lift", "stair", "lobby", "gate", "other", "maindoor", "door"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

/**
 * Doors are stored beside the rooms but are not rooms: each is just a LINE of two points (the two ends of the door) and has no button.
 *  • `maindoor` — the flat's entrance. Always drawn in its own colour, whatever is pressed, so it is easy to find.
 *  • `door` — a door of a room. Drawn in another colour only while the room it belongs to (the room whose wall it sits on) is selected.
 */
export const DOOR_TYPES: readonly RoomType[] = ["maindoor", "door"];
export const isDoorType = (type: RoomType): boolean => type === "maindoor" || type === "door";
/** The rooms people press (everything except doors). */
export const pressableRooms = (rooms: PlanRoom[]): PlanRoom[] => rooms.filter((r) => !isDoorType(r.type));
export const doorsOf = (rooms: PlanRoom[] | undefined): PlanRoom[] => (rooms ?? []).filter((r) => isDoorType(r.type));

export const ROOM_TYPE_LABEL: Record<RoomType, { one: string; many: string }> = {
  bedroom: { one: "bedroom", many: "bedrooms" },
  living: { one: "living room", many: "living rooms" },
  dining: { one: "dining room", many: "dining rooms" },
  kitchen: { one: "kitchen", many: "kitchens" },
  bathroom: { one: "bathroom", many: "bathrooms" },
  balcony: { one: "balcony", many: "balconies" },
  flat: { one: "flat", many: "flats" },
  servant: { one: "servant room", many: "servant rooms" },
  store: { one: "store room", many: "store rooms" },
  lift: { one: "lift", many: "lifts" },
  stair: { one: "stair", many: "stairs" },
  lobby: { one: "lobby", many: "lobbies" },
  gate: { one: "gate", many: "gates" },
  other: { one: "other space", many: "other spaces" },
  maindoor: { one: "main door", many: "main doors" },
  door: { one: "door", many: "doors" },
};

export interface PlanRoom {
  id: string;
  label: string;
  type: RoomType;
  /** Closed polygon, every point a 0–1 fraction of the drawing's width and height. */
  points: [number, number][];
}

export interface PlanRooms {
  /** width ÷ height of the drawing, so the polygons can be laid exactly over it. */
  aspect: number;
  rooms: PlanRoom[];
}

export const MAX_ROOMS = 80;

const TYPE_KEYWORDS: [RoomType, RegExp][] = [
  ["flat", /^\s*(flat|unit|apartment)\b/i],
  ["gate", /\bgate\b/i],
  ["lift", /\blift\b|elevator/i],
  ["stair", /stair/i],
  ["servant", /servant|maid|driver/i],
  ["store", /\bstore\b|storage/i],
  ["lobby", /lobby|corridor|passage|foyer|landing/i],
  ["kitchen", /kitchen|kitchenette|pantry/i],
  ["bathroom", /bath|toilet|wc|washroom|lavatory|shower/i],
  ["balcony", /balcon|veranda|verandah|\bver\b|terrace|deck/i],
  ["bedroom", /bed|master|guest room|nursery|\bbr\b/i],
  ["dining", /dining/i],
  ["living", /living|drawing|lounge|family|sitting|hall/i],
];

/** Best guess of a room's type from its name — used when a marker or a hand-marked room has no explicit type. */
export function guessRoomType(label: string): RoomType {
  for (const [type, re] of TYPE_KEYWORDS) if (re.test(label)) return type;
  return "other";
}

export function isRoomType(value: unknown): value is RoomType {
  return typeof value === "string" && (ROOM_TYPES as readonly string[]).includes(value);
}

/** "3 bedrooms", "2 balconies", "1 kitchen" — one entry per type that is present, in a sensible reading order. */
export function roomSummary(rooms: PlanRoom[]): { type: RoomType; count: number; text: string }[] {
  const out: { type: RoomType; count: number; text: string }[] = [];
  for (const type of ROOM_TYPES) {
    if (isDoorType(type)) continue; // doors are not rooms
    const count = rooms.filter((r) => r.type === type).length;
    if (count > 0) out.push({ type, count, text: `${count} ${count === 1 ? ROOM_TYPE_LABEL[type].one : ROOM_TYPE_LABEL[type].many}` });
  }
  return out;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Cleans anything that claims to be `PlanRooms` — wrong shapes are dropped, never trusted. Returns undefined when nothing usable is left. */
export function sanitizePlanRooms(input: unknown): PlanRooms | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as { aspect?: unknown; rooms?: unknown };
  const aspect = Number(raw.aspect);
  if (!(aspect > 0.05 && aspect < 50) || !Array.isArray(raw.rooms)) return undefined;

  const rooms: PlanRoom[] = [];
  for (const item of raw.rooms.slice(0, MAX_ROOMS) as Record<string, unknown>[]) {
    const label = String(item?.label ?? "").trim().slice(0, 60);
    const points = (Array.isArray(item?.points) ? (item.points as unknown[]) : [])
      .map((p) => (Array.isArray(p) ? ([Number(p[0]), Number(p[1])] as [number, number]) : null))
      .filter((p): p is [number, number] => p !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map((p) => [round4(clamp01(p[0])), round4(clamp01(p[1]))] as [number, number]);
    const type = isRoomType(item?.type) ? item.type : guessRoomType(label);
    if (isDoorType(type)) {
      // A door is a line: exactly its two ends.
      if (points.length < 2) continue;
      rooms.push({
        id: String(item?.id ?? "").trim().slice(0, 40) || `door-${rooms.length + 1}`,
        label: label || (type === "maindoor" ? "Main door" : "Door"),
        type,
        points: [points[0], points[1]],
      });
      continue;
    }
    if (!label || points.length < 3) continue;
    rooms.push({
      id: String(item?.id ?? "").trim().slice(0, 40) || `room-${rooms.length + 1}`,
      label,
      type,
      points,
    });
  }
  // Ids must be unique (they key the buttons and the animation).
  const seen = new Set<string>();
  for (const r of rooms) {
    let id = r.id;
    for (let n = 2; seen.has(id); n++) id = `${r.id}-${n}`;
    r.id = id;
    seen.add(id);
  }
  return rooms.length > 0 ? { aspect: round4(aspect), rooms } : undefined;
}

// ---- Reading room markers out of an SVG ----

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[1] ?? m[2]) : undefined;
}

function nums(text: string): number[] {
  return (text.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number).filter(Number.isFinite);
}

/** Straight-line flattening of an SVG path: M L H V Z (absolute and relative); curves and arcs are followed to their end point. */
function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  const pts: [number, number][] = [];
  let x = 0, y = 0, sx = 0, sy = 0;
  let cmd = "";
  let i = 0;
  const num = () => Number(tokens[i++]);
  const hasNum = () => i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i]);
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) cmd = tokens[i++];
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === "Z") { x = sx; y = sy; continue; }
    if (C === "M" || C === "L" || C === "T") {
      while (hasNum()) {
        const nx = num(), ny = num();
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        if (C === "M") { sx = x; sy = y; cmd = rel ? "l" : "L"; }
        pts.push([x, y]);
        if (C === "M") break;
      }
    } else if (C === "H") {
      while (hasNum()) { const nx = num(); x = rel ? x + nx : nx; pts.push([x, y]); }
    } else if (C === "V") {
      while (hasNum()) { const ny = num(); y = rel ? y + ny : ny; pts.push([x, y]); }
    } else {
      const arity = C === "C" ? 6 : C === "S" || C === "Q" ? 4 : C === "A" ? 7 : 0;
      if (!arity) break;
      while (hasNum()) {
        const v: number[] = [];
        for (let k = 0; k < arity; k++) v.push(num());
        const nx = v[arity - 2], ny = v[arity - 1];
        x = rel ? x + nx : nx; y = rel ? y + ny : ny;
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

function shapePoints(tag: string, name: string): [number, number][] {
  const n = (a: string, fallback = 0) => {
    const v = attr(tag, a);
    return v === undefined ? fallback : parseFloat(v);
  };
  if (name === "polygon" || name === "polyline") {
    const v = nums(attr(tag, "points") ?? "");
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
    return pts;
  }
  if (name === "rect") {
    const x = n("x"), y = n("y"), w = n("width"), h = n("height");
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  if (name === "circle" || name === "ellipse") {
    const cx = n("cx"), cy = n("cy");
    const rx = name === "circle" ? n("r") : n("rx");
    const ry = name === "circle" ? n("r") : n("ry");
    return Array.from({ length: 24 }, (_, k) => [cx + rx * Math.cos((k / 24) * Math.PI * 2), cy + ry * Math.sin((k / 24) * Math.PI * 2)] as [number, number]);
  }
  if (name === "path") return pathPoints(attr(tag, "d") ?? "");
  return [];
}

/**
 * Finds the room markers in an SVG: any `<polygon|rect|polyline|path|circle|ellipse>` carrying `data-room="Name"`, with an optional
 * `data-room-type` (bedroom, living, dining, kitchen, bathroom, balcony, other — guessed from the name when absent). Needs a viewBox.
 * Markers should be drawn with no transform. Returns null when the file has no usable markers.
 */
export function extractRoomsFromSvg(svg: string): PlanRooms | null {
  const vb = svg.match(/<svg\b[^>]*\bviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i);
  if (!vb) return null;
  const [minX, minY, w, h] = [parseFloat(vb[1]), parseFloat(vb[2]), parseFloat(vb[3]), parseFloat(vb[4])];
  if (!(w > 0 && h > 0)) return null;

  const mx = readBpMatrix(svg);
  const place = (px: number, py: number): [number, number] => (mx ? [mx[0] * px + mx[2] * py + mx[4], mx[1] * px + mx[3] * py + mx[5]] : [px, py]);
  const rooms: PlanRoom[] = [];
  for (const m of svg.matchAll(/<(polygon|polyline|rect|path|circle|ellipse)\b[^>]*>/gi)) {
    const tag = m[0];
    const label = attr(tag, "data-room");
    if (label === undefined || !label.trim()) continue;
    const pts = shapePoints(tag, m[1].toLowerCase());
    if (pts.length < 3) continue;
    const typeAttr = (attr(tag, "data-room-type") ?? "").trim().toLowerCase();
    rooms.push({
      id: (attr(tag, "data-room-id") ?? "").trim() || `room-${rooms.length + 1}`,
      label: label.trim(),
      type: isRoomType(typeAttr) ? typeAttr : guessRoomType(label),
      points: pts.map(([px, py]) => {
        const [qx, qy] = place(px, py);
        return [(qx - minX) / w, (qy - minY) / h] as [number, number];
      }),
    });
  }
  // Doors: `<line|polyline|path|rect data-door="main">` (the flat's entrance) or `data-door="room"` (a room's door). Only the two ends are kept.
  for (const m of svg.matchAll(/<(line|polygon|polyline|rect|path)\b[^>]*>/gi)) {
    const tag = m[0];
    const kind = (attr(tag, "data-door") ?? "").trim().toLowerCase();
    if (!kind) continue;
    const name = m[1].toLowerCase();
    const pts = name === "line" ? [[parseFloat(attr(tag, "x1") ?? "0"), parseFloat(attr(tag, "y1") ?? "0")], [parseFloat(attr(tag, "x2") ?? "0"), parseFloat(attr(tag, "y2") ?? "0")]] as [number, number][] : shapePoints(tag, name);
    const ends = farthestPair(pts);
    if (!ends) continue;
    const isMain = /^(main|entrance|entry|front)/.test(kind);
    rooms.push({
      id: (attr(tag, "data-door-id") ?? "").trim() || `door-${rooms.length + 1}`,
      label: isMain ? "Main door" : "Door",
      type: isMain ? "maindoor" : "door",
      points: ends.map(([px, py]) => {
        const [qx, qy] = place(px, py);
        return [(qx - minX) / w, (qy - minY) / h] as [number, number];
      }),
    });
  }
  return sanitizePlanRooms({ aspect: w / h, rooms }) ?? null;
}

/** The two points of a shape that are furthest apart — the two ends of a door drawn as a line or a thin box. */
function farthestPair(pts: [number, number][]): [[number, number], [number, number]] | null {
  if (pts.length < 2 || pts.some((p) => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) return null;
  let best: [[number, number], [number, number]] | null = null;
  let max = 0;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2;
      if (d > max) {
        max = d;
        best = [pts[i], pts[j]];
      }
    }
  }
  return best;
}

/** Shortest distance from a point to the edge of a polygon (0–1 fractions). */
function distanceToPolygonEdge(p: [number, number], poly: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - (ax + t * dx), p[1] - (ay + t * dy)));
  }
  return best;
}

/** How close a door has to be to a wall (as a fraction of the drawing) to count as "on" it. */
const DOOR_TOLERANCE = 0.025;

/** A door sits on a wall, so it is "in" a room or flat when its middle is inside the outline or right on its edge. */
export function doorBelongsTo(door: PlanRoom, outline: [number, number][]): boolean {
  if (door.points.length < 2 || outline.length < 3) return false;
  const mid: [number, number] = [(door.points[0][0] + door.points[1][0]) / 2, (door.points[0][1] + door.points[1][1]) / 2];
  return pointInPolygon(mid, outline) || distanceToPolygonEdge(mid, outline) <= DOOR_TOLERANCE;
}

/** width ÷ height from an SVG's viewBox, or null. */
export function svgAspect(svg: string): number | null {
  const vb = svg.match(/<svg\b[^>]*\bviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i);
  if (!vb) return null;
  const w = parseFloat(vb[3]), h = parseFloat(vb[4]);
  return w > 0 && h > 0 ? w / h : null;
}

export function polygonCentroid(points: [number, number][]): [number, number] {
  // Area-weighted centroid; falls back to the plain average for degenerate (zero-area) shapes.
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(a) < 1e-9) return [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
  return [cx / (3 * a), cy / (3 * a)];
}

// ---- Flat and parking markers on a whole-floor / parking-level drawing ----

export interface AreaMarker {
  kind: "flat" | "parking";
  /** The flat's code ("A") or the parking space's number ("P-01"). */
  key: string;
  points: [number, number][];
}

/**
 * Reads the area markers of a whole-floor drawing: `data-flat="A"` marks where flat A sits, `data-parking="P-01"` marks parking bay P-01.
 * Same shapes as room markers (`<polygon>` / `<rect>` / straight `<path>`, drawn with no transform, `fill="none" stroke="none"`).
 * An admin (or an AI told to add them) can therefore "select" every flat and parking bay inside the SVG itself; the editor and the upload
 * both pick them up automatically. Returns null when the file has none.
 */
export function extractAreasFromSvg(svg: string): { aspect: number; areas: AreaMarker[] } | null {
  const vb = svg.match(/<svg\b[^>]*\bviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i);
  if (!vb) return null;
  const [minX, minY, w, h] = [parseFloat(vb[1]), parseFloat(vb[2]), parseFloat(vb[3]), parseFloat(vb[4])];
  if (!(w > 0 && h > 0)) return null;

  const mx = readBpMatrix(svg);
  const place = (px: number, py: number): [number, number] => (mx ? [mx[0] * px + mx[2] * py + mx[4], mx[1] * px + mx[3] * py + mx[5]] : [px, py]);
  const areas: AreaMarker[] = [];
  for (const m of svg.matchAll(/<(polygon|polyline|rect|path|circle|ellipse)\b[^>]*>/gi)) {
    const tag = m[0];
    const flat = attr(tag, "data-flat");
    const parking = attr(tag, "data-parking");
    const key = (flat ?? parking ?? "").trim();
    if (!key) continue;
    const pts = shapePoints(tag, m[1].toLowerCase());
    if (pts.length < 3) continue;
    areas.push({
      kind: flat !== undefined && flat.trim() ? "flat" : "parking",
      key: key.slice(0, 40),
      points: pts.map(([px, py]) => {
        const [qx, qy] = place(px, py);
        return [round4(clamp01((qx - minX) / w)), round4(clamp01((qy - minY) / h))] as [number, number];
      }),
    });
  }
  return areas.length > 0 ? { aspect: round4(w / h), areas } : null;
}

/** "P-01", "p01", "P 1" → "P1": how a parking space's number is compared with a marked bay's name. */
export function normalizeAreaKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(^|[A-Z])0+(\d)/g, "$1$2");
}

export { attr as svgAttr, shapePoints as svgShapePoints };

/** The `data-bp-matrix` the upload auto-fix puts on its wrapper group (rotation) — marker coordinates are given BEFORE it, so it must be applied to them. */
export function readBpMatrix(svg: string): [number, number, number, number, number, number] | null {
  const m = svg.match(/\bdata-bp-matrix\s*=\s*["']\s*([^"']+?)\s*["']/i);
  if (!m) return null;
  const v = nums(m[1]);
  return v.length === 6 ? (v as [number, number, number, number, number, number]) : null;
}

/** Rotates a point given as a 0–1 fraction of the drawing by 90° steps (clockwise positive), for drawings that get rotated after rooms were marked. */
export function rotateFraction([x, y]: [number, number], deg: 90 | -90 | 180): [number, number] {
  if (deg === 90) return [round4(1 - y), round4(x)];
  if (deg === -90) return [round4(y), round4(1 - x)];
  return [round4(1 - x), round4(1 - y)];
}

/** Is the point inside the polygon? (ray casting) */
export function pointInPolygon([x, y]: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The rooms that belong to one flat: those whose centre lies inside the flat's outline. */
export function roomsInside(rooms: PlanRoom[], outline: [number, number][]): PlanRoom[] {
  return rooms.filter((r) => (isDoorType(r.type) ? doorBelongsTo(r, outline) : pointInPolygon(polygonCentroid(r.points), outline)));
}

// ---- One flat out of a whole-floor drawing (public unit pages) ----

/** Where one flat sits on a whole-floor drawing — so a unit page can show just that flat, as if it had its own plan. */
export interface FlatOutline {
  aspect: number;
  points: [number, number][];
}

export function sanitizeFlatOutline(input: unknown): FlatOutline | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as { aspect?: unknown; points?: unknown };
  const aspect = Number(raw.aspect);
  if (!(aspect > 0.05 && aspect < 50) || !Array.isArray(raw.points)) return undefined;
  const points = (raw.points as unknown[])
    .map((p) => (Array.isArray(p) ? ([Number(p[0]), Number(p[1])] as [number, number]) : null))
    .filter((p): p is [number, number] => p !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]))
    .map((p) => [round4(clamp01(p[0])), round4(clamp01(p[1]))] as [number, number]);
  return points.length >= 3 ? { aspect: round4(aspect), points } : undefined;
}

/**
 * What a public unit page should draw: with a flat outline, the plan is framed on that flat and only the rooms inside it are offered;
 * without one, the whole drawing and all its rooms. `plan` is absent when there is nothing interactive to show.
 */
export function unitPlanView(rooms?: PlanRooms, flat?: FlatOutline): { plan?: PlanRooms; frame?: [number, number][] } {
  if (flat) {
    const inside = rooms ? flatLevelRooms(roomsInside(rooms.rooms, flat.points)) : [];
    return { plan: { aspect: rooms?.aspect ?? flat.aspect, rooms: inside }, frame: flat.points };
  }
  // Without an outline the plan is the flat's own drawing: show its rooms (not building-level things like a lift marker).
  return rooms ? { plan: { aspect: rooms.aspect, rooms: flatLevelRooms(rooms.rooms) } } : {};
}

// ---- How a whole-floor plan is placed on the client's screens ----

/**
 * The admin's own placement of a whole-floor plan on the client app: a free tilt (any angle — for a drawing that was drawn slightly
 * off-square), a zoom and a shift. Applied when the plan is DISPLAYED (nothing is baked into the file), so it can always be changed
 * or reset. Shift is a percentage of the plan's own size.
 */
export interface PlanView {
  /** Degrees, clockwise. */
  tilt: number;
  /** 1 = as fitted. */
  zoom: number;
  x: number;
  y: number;
}

export const NEUTRAL_VIEW: PlanView = { tilt: 0, zoom: 1, x: 0, y: 0 };

const num = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};

export function sanitizePlanView(input: unknown): PlanView | undefined {
  if (!input || typeof input !== "object") return undefined;
  const r = input as Record<string, unknown>;
  const view: PlanView = {
    tilt: Math.round(num(r.tilt, -180, 180, 0) * 10) / 10,
    zoom: Math.round(num(r.zoom, 0.4, 2.5, 1) * 100) / 100,
    x: Math.round(num(r.x, -60, 60, 0) * 10) / 10,
    y: Math.round(num(r.y, -60, 60, 0) * 10) / 10,
  };
  return view.tilt === 0 && view.zoom === 1 && view.x === 0 && view.y === 0 ? undefined : view;
}

/**
 * The CSS transform for a plan box of the given width ÷ height. A tilted drawing is also shrunk just enough that its corners stay inside
 * the box (so a tilt never crops the plan); the admin's zoom multiplies on top of that. `tiltOnly` ignores zoom and shift (the Home screen
 * frames one flat, where only the tilt makes sense).
 */
export function planViewTransform(view: PlanView | undefined, aspect: number, tiltOnly = false): string | undefined {
  if (!view) return undefined;
  const t = (view.tilt * Math.PI) / 180;
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  const fit = Math.min(1 / (c + s / aspect), 1 / aspect / (s + c / aspect));
  const zoom = tiltOnly ? 1 : view.zoom;
  const x = tiltOnly ? 0 : view.x;
  const y = tiltOnly ? 0 : view.y;
  if (view.tilt === 0 && zoom === 1 && x === 0 && y === 0) return undefined;
  return `translate(${x}%, ${y}%) rotate(${view.tilt}deg) scale(${(zoom * fit).toFixed(4)})`;
}

// ---- One-press marking: the common things, named and numbered automatically ----

export interface RoomPreset {
  /** Button text. */
  label: string;
  type: RoomType;
  /** Name given to the first one. Further ones are numbered ("Bedroom 1", "Bedroom 2"…). */
  base: string;
  /** true: always numbered from 1 (Bedroom 1, Bedroom 2). false: the first has no number (Kitchen), the next is "Kitchen 2". */
  numbered: boolean;
}

/** Marking a FLAT's plan: its rooms. */
export const FLAT_PRESETS: RoomPreset[] = [
  { label: "Bedroom", type: "bedroom", base: "Bedroom", numbered: true },
  { label: "Master bedroom", type: "bedroom", base: "Master bedroom", numbered: false },
  { label: "Kitchen", type: "kitchen", base: "Kitchen", numbered: false },
  { label: "Bathroom", type: "bathroom", base: "Bathroom", numbered: true },
  { label: "Drawing room", type: "living", base: "Drawing room", numbered: false },
  { label: "Dining", type: "dining", base: "Dining", numbered: false },
  { label: "Balcony", type: "balcony", base: "Balcony", numbered: true },
  { label: "Servant room", type: "servant", base: "Servant room", numbered: false },
  { label: "Store", type: "store", base: "Store room", numbered: false },
];

/** Marking a whole-FLOOR drawing of the building: its flats, lift, stairs and lobby. */
export const BUILDING_PRESETS: RoomPreset[] = [
  { label: "Flat", type: "flat", base: "Flat", numbered: false },
  { label: "Lift", type: "lift", base: "Lift", numbered: false },
  { label: "Stair", type: "stair", base: "Stair", numbered: false },
  { label: "Lobby", type: "lobby", base: "Lobby", numbered: false },
  { label: "Main gate", type: "gate", base: "Main gate", numbered: false },
];

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The next free name for a preset: "Bedroom 1", then "Bedroom 2"… ("Kitchen", then "Kitchen 2"…). Flats get the next letter: "Flat A", "Flat B"…
 * Looks at the names already on the plan, so deleting one and adding another never makes a duplicate.
 */
export function nextAreaLabel(preset: RoomPreset, existing: string[]): string {
  if (preset.type === "flat") {
    const used = new Set(existing.map((l) => l.match(/^\s*flat\s+([A-Za-z])\s*$/i)?.[1]?.toUpperCase()).filter(Boolean) as string[]);
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return `Flat ${letter}`;
    }
    return "Flat";
  }
  const re = new RegExp(`^\\s*${escapeRe(preset.base)}(?:\\s+(\\d+))?\\s*$`, "i");
  let max = 0;
  let any = false;
  for (const label of existing) {
    const m = label.match(re);
    if (!m) continue;
    any = true;
    max = Math.max(max, m[1] ? parseInt(m[1], 10) : 1);
  }
  if (preset.numbered) return `${preset.base} ${max + 1}`;
  return any ? `${preset.base} ${max + 1}` : preset.base;
}

/** The corners of a rectangle given two opposite corners (0–1 fractions), clockwise from the top-left. */
export function rectFromCorners(a: [number, number], b: [number, number]): [number, number][] {
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

// ---- Which kinds belong on which screen ----

/** What a drawing of a whole building floor shows as buttons: its flats, lift, stairs, lobby (and other shared spaces). */
const BUILDING_LEVEL: RoomType[] = ["flat", "lift", "stair", "lobby", "gate", "other", "maindoor"];
/** What a single flat's plan shows as buttons: its rooms (and other spaces). A flat's own marker is never one of its rooms. Doors ride along (drawn, never a button). */
const FLAT_LEVEL: RoomType[] = ["bedroom", "living", "dining", "kitchen", "bathroom", "balcony", "servant", "store", "other", "maindoor", "door"];

/** The areas of a building-floor drawing that the public project page offers (flats, lift, stairs…). Undefined when there are none. */
export function buildingLevel(plan?: PlanRooms): PlanRooms | undefined {
  const rooms = plan?.rooms.filter((r) => BUILDING_LEVEL.includes(r.type)) ?? [];
  // Main doors alone make nothing to press, so they never turn a plain plan into an interactive one.
  return plan && pressableRooms(rooms).length > 0 ? { aspect: plan.aspect, rooms } : undefined;
}

/** The rooms of one flat (bedroom, kitchen…) — flats, lifts and stairs are not rooms. */
export function flatLevelRooms(rooms: PlanRoom[]): PlanRoom[] {
  return rooms.filter((r) => FLAT_LEVEL.includes(r.type));
}
