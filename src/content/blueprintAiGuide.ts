/**
 * Everything the Admin → Settings → Blueprint AI page tells an admin and hands to an AI.
 *
 * The idea: an admin takes the architect's drawing (a photo, a PDF, a CAD export, a JPG/PNG screenshot), gives it to an AI
 * together with the MASTER PROMPT below, and gets back an SVG that is a FAITHFUL copy of that drawing — same structure,
 * same lettering, same columns, same everything — already following this app's drawing rules so it looks right on the
 * blue blueprint sheet and never makes a phone paint torn or slow. The same rules are enforced in code by
 * `lib/blueprintSvg.ts` (the checker on that page, and the upload guard), and the numbers here are read from its
 * `BLUEPRINT_SVG_LIMITS`, so the prompt, the checker and the guard can't drift apart.
 */
import { BLUEPRINT_SVG_LIMITS as L } from "@/lib/blueprintSvg";

export interface FlatDetails {
  name: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  sizeSqft: string;
  notes: string;
}

/**
 * The first thing an AI reads, in both prompts. The company's real drawings carry the building's real structure
 * (columns, walls, parking bays, lift and stair cores, plot boundary) and its real lettering (room names, sizes,
 * dimensions) — an earlier version of these rules told the AI to simplify and drop all of that, and the result no longer
 * matched the building. So: copy, never redesign.
 */
const FIDELITY = `THE GOLDEN RULE — FAITHFUL COPY, NEVER A REDESIGN:
This is a real building. The drawing I give you shows its real structure, real measurements and real lettering. Your job is to COPY it exactly, not to improve, simplify, tidy up, re-plan or "fix" it.
• NEVER change the structure or the design: every wall, column/pillar (including its cross or fill), beam line, stair, lift, shaft, door, window, balcony, verandah, parking bay, ramp, gate, plot/site boundary and neighbouring-road line stays exactly where, and exactly as long, wide and thick as, it is in the drawing. Do not move, resize, straighten, mirror, rotate, merge, remove or add anything.
• KEEP EVERY DETAIL: dimension lines and their arrows/ticks, level marks, hatching (floor tiles, driveway, stair treads, lawn dots), fixtures and furniture, cars in their bays, toilets, kitchen counters, the compass/north sign, and the position of every item. If a detail is small, keep it small — do not drop it.
• KEEP EVERY WORD AND NUMBER: room names, room sizes (e.g. BED 13'-6"X13'-8"), unit names, areas in SFT, dimension values, notes — same text, same spelling, same position, same orientation (rotated text stays rotated), same relative size. Do not translate, correct or reword anything. Add no text that is not in the drawing.
• The only things you may leave out: the paper sheet border/frame, the title block, and the big drawing title (e.g. "Typical Floor Plan") — the app shows its own title.
• If something is unclear, copy what you can see as closely as you can. Never replace it with your own idea of what it "should" be, and never silently skip it. If a piece is truly unreadable, keep its shape and leave out only the unreadable characters.
• Orientation: if the sheet was exported sideways, rotate the WHOLE drawing so its lettering reads upright. Rotate everything together, never part of it.`;

const INPUT = `INPUT — the drawing can arrive in ANY form: an SVG (any kind, even a messy one from CAD or another tool), a PDF (vector or scanned), a CAD export, a JPG/PNG, a screenshot, a phone photo of paper, or several of these. Whatever form it is in, the job is the same: produce one faithful SVG that follows the rules below. Do not ask which form is "right" and do not ask me to re-send it in another form — work with what is attached.
• For an SVG, vector PDF or CAD file: read the real vector shapes and use their exact coordinates instead of re-tracing by eye — this is how the walls, columns and lettering stay exactly right. An SVG that already exists must be cleaned up to the rules (merge paths, outline any <text>, drop backgrounds/frames, add the markers), never redrawn.
• For a picture: measure carefully against the wall grid and the written dimensions, and keep the same proportions as closely as you can.
• Several pages/floors: make one SVG per floor, each complete on its own.`;

/** The drawing rules, shared by both prompts. Written for an AI, so it is plain, literal and numbered. */
const RULES = `DRAWING RULES — follow every one:
1. OUTPUT: one single SVG per drawing, in one code block, nothing else. No explanation before or after it.
2. CANVAS: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" fill="none" stroke="${L.ink}" stroke-linecap="round" stroke-linejoin="round">. Pick W and H so the LONGER side is ${L.canvas} and the proportions are exactly those of the drawing. Always include viewBox. Do not set width/height.
3. ONE INK, TRANSPARENT: one colour only — ${L.ink} — whatever colours the source uses (the app recolours it white on the blue sheet). No background rectangle, no page colour, no white shapes, no paper frame, no title block. Colour differences in the source become different line weights, never different colours.
4. LETTERING = OUTLINED SHAPES, NEVER <text>: fonts differ per phone, so convert every word and number into outline shapes (glyph outlines) and put ALL of them into ONE <path fill="${L.ink}" fill-rule="evenodd" stroke="none" d="…"/>. Keep each text block's position, size and rotation exactly as in the drawing. Never use <text>, <tspan>, fonts or <textPath>.
5. LINE WEIGHTS: walls and the plot boundary heavy, doors/windows/furniture/fixtures medium, hatching/dimension lines/fine detail thin — copy the drawing's own hierarchy. Use as few distinct widths as you can (three is ideal) and put every line of the same width into ONE <path>.
6. SOLID DETAILS: columns that are filled solid, solid triangles/arrowheads and similar may go into the same filled path as the lettering, or one extra filled path (fill="${L.ink}", stroke="none"). Nothing else may be filled; everything else is outline (fill="none"). At most ${L.maxFilledPaths} filled paths in total.
7. REAL GAPS: never paint white to fake an opening. A door or window is a real gap in the wall line with its leaf, swing arc and glazing lines drawn exactly as in the source.
8. HATCHING: draw it as merged thin lines or dots in the same few paths — same spacing and angle as the source. Do not use <pattern>.
9. FIDELITY CHECK POINTS: the drawing's columns, rooms, parking bays, cars, fixtures, dimension lines and every text label must each be present, in the same place. Count them in the source and in your SVG and make the counts match.
10. ALLOWED ELEMENTS ONLY: <svg>, <g> and <path> (<line>, <rect>, <circle>, <ellipse>, <polyline>, <polygon> are tolerated, but prefer merged <path>). FORBIDDEN: <text>, <tspan>, <image>, <filter> or any <fe…>, <mask>, <clipPath>, <pattern>, gradients, <style> or CSS classes, <use>/<symbol>, <script>, <foreignObject>, animation, opacity, transform tricks, blend modes, base64 pictures, external links.
11. KEEP IT LIGHT WITHOUT LOSING DETAIL: merge shapes into FEW <path> elements — roughly one per line width, plus one for lettering and solid details (about 5 elements in total, not hundreds). Use relative path commands and at most ONE decimal in coordinates. Target under ${L.recommendedElements} elements and under ${L.recommendedBytes / 1024} KB; hard limit ${L.maxElements} elements and ${L.maxBytes / 1024} KB. If you must cut size, simplify curve smoothness inside letters and decoration — never remove a wall, column, label, dimension or fixture.
12. ROOM MARKERS — this is how the app connects the plan to its room buttons automatically (a visitor presses "Kitchen" and the kitchen lifts off the plan, darker and bolder, while everything else fades). After ALL the drawing, add one last group <g id="rooms"> with ONE invisible marker per room or space, exactly like this:
   <polygon data-room="Master bedroom" data-room-type="bedroom" points="120,80 430,80 430,360 120,360" fill="none" stroke="none"/>
   • The polygon traces the room's INNER floor area (the inside faces of its walls) with straight lines, in the same viewBox coordinates as the drawing. Absolute numbers, no transform, no curves — use <polygon> or <rect>.
   • data-room = the room's name exactly as the drawing writes it (BED, KITCHEN, DRAWING, TOILET, VER.…). When a name repeats, number it: "Bedroom 1", "Bedroom 2", "Toilet 1".
   • data-room-type = one of: flat, bedroom, living, dining, kitchen, bathroom, balcony, servant, store, lift, stair, lobby, gate, other. Verandas and balconies are "balcony"; drawing/living/family rooms "living"; a servant/maid room "servant"; a store room "store"; a lift "lift"; a staircase "stair"; a shared lobby or corridor "lobby"; the main entrance gate (and any other vehicle/pedestrian gate) "gate"; anything else "other".
   • NUMBERING: number rooms of one kind in a steady order (left to right, top to bottom): "Bedroom 1", "Bedroom 2", "Bedroom 3"; "Bathroom 1", "Bathroom 2"; "Balcony 1", "Balcony 2". A kind that occurs once needs no number ("Kitchen", "Drawing room", "Dining").
   • TWO LEVELS from one drawing. A drawing of ONE FLAT: mark its rooms (bedroom … store). A drawing of a WHOLE BUILDING FLOOR (several flats around a lift and stair): mark the BUILDING-level things — each flat as data-room="Flat A" data-room-type="flat" (its whole outline, outer walls included; letters as the drawing prints them, A, B, C…), the lift as data-room="Lift" data-room-type="lift", the staircase "Stair" (stair), the shared corridor/lobby "Lobby" (lobby), the entrance "Main gate" (gate — on the ground-floor/site plan), and any other shared space (guard post, meter room, EMR room) as "other" — and ALSO the rooms inside each flat as above if you can. The app shows the building-level markers on the public project page and each flat's own rooms on its flat page.
   • Include EVERY room or space of the drawing at the level you are marking (bedroom, bathroom/toilet, kitchen, living, dining, balcony/verandah, servant room, store; or flat, lift, stair, lobby) — none missing, none invented. Markers must not overlap each other and must never spill outside the walls.
   • Markers are never painted (fill="none" stroke="none"); they are not lettering and not a fill, so they do not count against rules 4, 6 or 10. Do not draw the room names again for the markers.
13. FLAT AND PARKING MARKERS — ONLY for a drawing of a WHOLE FLOOR or a PARKING LEVEL (several flats or bays in one drawing). They let the app light up one owner's flat or parking bay among the others, show a unit's page with just ITS flat cut out of the floor, and offer each flat's rooms as buttons — automatically, with nothing marked by hand. After the drawing (and after the room markers, if any), add:
   <g id="flats"> with ONE invisible marker per flat: <polygon data-flat="A" points="x,y x,y …" fill="none" stroke="none"/>
   <g id="parking"> with ONE invisible marker per parking bay: <polygon data-parking="P-01" points="x,y x,y …" fill="none" stroke="none"/>
   • data-flat = the flat's code, the part of its number that repeats on every floor: "A" for flats 1A, 2A, 3A. Use the code the drawing itself prints (UNIT-A → "A"). One marker per flat on the floor.
   • The flat polygon traces the flat's WHOLE outer boundary — its outer walls included, its balconies/verandahs included — and NOT the shared lift, stair, lobby or corridor. Flats never overlap each other.
   • data-parking = the bay's number as the drawing or the admin names it ("P-01", "P-02"…). If the drawing numbers no bays, number them left-to-right, top-to-bottom as P-01, P-02… and tell the admin in one line before the code. The polygon is the painted bay rectangle (the car's rectangle).
   • Same rules as the room markers: straight-line <polygon>/<rect>, absolute viewBox coordinates, no transform, fill="none" stroke="none", never painted, no overlap, none missing, none invented.
14. ORIENTATION: give the drawing upright — the lettering reading left to right, north wherever the architect put it. (If a drawing does arrive sideways the app turns it upright and trims its empty margins on upload, and the admin has a rotate button — but an upright file is always best.) Never rotate only part of a drawing.
15. SELF-CHECK before answering: viewBox present · no <text> · no white · no <filter>/<mask>/<image> · no background rectangle · lettering is in ONE filled path · same walls, columns, doors, windows, stairs, lift, bays, hatching, dimensions and labels as the source (counts match) · structure and positions unchanged · <g id="rooms"> has one data-room marker per room, each with data-room-type, none overlapping · whole-floor/parking drawing: one data-flat marker per flat and one data-parking marker per bay, flats outlined with their walls, none overlapping · under ${L.recommendedElements} elements. Fix anything that fails, then output only the final SVG.`;

function detailsBlock(d: FlatDetails): string {
  const lines = [
    d.name.trim() && `Flat: ${d.name.trim()}`,
    d.bedrooms.trim() && `Bedrooms: ${d.bedrooms.trim()}`,
    d.bathrooms.trim() && `Bathrooms: ${d.bathrooms.trim()}`,
    d.balconies.trim() && `Balconies/verandahs: ${d.balconies.trim()} (mark each one as its own "Balcony" room marker)`,
    d.sizeSqft.trim() && `Size: ${d.sizeSqft.trim()} sq ft`,
    d.notes.trim() && `Notes from the admin: ${d.notes.trim()}`,
  ].filter(Boolean);
  return lines.length > 0 ? `\nABOUT THIS DRAWING (use it to check your copy, never to override the drawing):\n${lines.join("\n")}\n` : "";
}

/** Prompt 1 — turn a drawing (picture, PDF, CAD export) into a faithful, compliant SVG. The admin attaches the file to the AI chat together with this text. */
export function createPrompt(d: FlatDetails): string {
  return `You are an architectural draftsperson who copies real floor plans, exactly, as clean SVG line art for a real-estate app's "blueprint" screen. The app shows your SVG as white lines on a blue blueprint sheet, on phones, and lets customers pinch-zoom it — so every wall, column, word and number must be exactly right and crisp.

TASK: I attach an architect's drawing (a flat plan, a typical floor, a ground floor, a parking level — any of them). Copy it into ONE SVG that follows the rules below exactly.

${FIDELITY}

${INPUT}
${detailsBlock(d)}
${RULES}`;
}

/** Prompt 2 — change an existing SVG. The admin pastes the current SVG under the text and describes the change. */
export function editPrompt(change: string): string {
  return `You are an architectural draftsperson maintaining floor-plan SVGs for a real-estate app's "blueprint" screen (white lines on a blue sheet, viewed on phones with pinch-zoom).

FIRST, check what I gave you. If the current SVG is pasted at the bottom, do the task below. If NO SVG is pasted but a drawing is attached (JPG, PNG, PDF, CAD export, or an SVG file), treat the attached drawing as the source and copy it faithfully into one SVG following the rules below, with the change applied if I described one. Only if there is no SVG and no drawing at all, reply with one short sentence asking me to attach or paste it — never invent a plan.

TASK: Below is the current SVG of a real plan. Apply ONLY the change I ask for. Everything else must stay exactly as it is — same viewBox, same walls, same columns, same stairs/lift/bays, same hatching, same dimensions, same lettering (words, numbers, positions, sizes), same line weights, same style. Return the complete updated SVG — not a diff, not a fragment.

If my change would alter the building's structure (walls, columns, openings, layout, measurements) and I did not clearly ask for exactly that, do NOT do it: keep the drawing as it is and say in one short sentence, before the code block, what you did not change and why.

THE CHANGE I WANT:
${change.trim() || "[describe the change here — for example: fix the typo in the BED label of the north-west room; remove the guard-post label; mirror the whole plan left-to-right for the opposite-hand flat]"}

${RULES}

CURRENT SVG:
[paste the whole current SVG here]`;
}

/** What an admin can do with an AI on a plan — shown as a plain list on the page. */
export const AI_CAN_DO: string[] = [
  "Copy an architect's drawing — JPG, PNG, a PDF (vector or scanned), a CAD export, a screenshot, even a phone photo of paper — into a clean SVG, with its lettering, dimensions, columns and every detail.",
  "Turn a drawing that was exported sideways the right way up (the whole drawing rotates together).",
  "Add the flat and parking markers to a whole-floor or parking-level drawing, so the app lights up each owner's own flat or bay automatically.",
  "Add the room markers to a plan that has none, so its rooms become buttons on the public site (nothing else in the drawing changes).",
  "Fix a typo in a label, or update a number, when you tell it exactly which one.",
  "Mirror the whole plan (left↔right or top↔bottom) to make the opposite-hand version of the same flat.",
  "Change the plan only where you explicitly ask — for example make a variant of one flat type — and nowhere else.",
  "Slim down a heavy SVG (too many shapes, a background, white lines, <text>) so it passes the checker, without losing any wall, column or label.",
  "Fix a plan that looks wrong on the phone — torn, noisy, slow or showing black bars.",
];

export const AI_MUST_KEEP: string[] = [
  "The building's structure and design — every wall, column, stair, lift, door, window, parking bay, boundary line — exactly where and as big as in the drawing. Never moved, resized, merged, removed or added.",
  "Every detail: dimension lines, hatching, fixtures, furniture, cars, the north sign — nothing dropped because it is small.",
  "Every word and number (room names, sizes, areas, dimensions) — same text, same position, same size and rotation, converted to outline shapes (never <text>).",
  "One ink colour (" + L.ink + "), no background, no frame, no white paint. Only fills allowed: the lettering path and solid details (at most " + L.maxFilledPaths + " filled paths).",
  "A viewBox on the <svg> tag, with the longer side at " + L.canvas + ".",
  "The invisible flat and parking markers of a whole-floor/parking drawing (<g id=\"flats\"> with data-flat, <g id=\"parking\"> with data-parking) — exact outlines, nothing missing, no overlap.",
  "The invisible room markers (<g id=\"rooms\">, one data-room + data-room-type polygon per room) — they connect the plan to the public site's room buttons.",
  "Real gaps in walls for doors and windows — never white paint.",
  "No pictures, filters, masks, gradients, patterns, styles or scripts.",
  "A few merged <path> elements — about 5 in total, under " + L.recommendedElements + " shapes and " + L.recommendedBytes / 1024 + " KB.",
];

/** One step of the whole Blueprint AI flow, in the order to do them. `anchor` jumps to its section on this page; `link` opens the page where the step is done. */
export interface WorkflowStep {
  title: string;
  body: string;
  anchor?: string;
  link?: { href: string; label: string };
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: "Make the SVG",
    body: "Only have a picture, PDF or CAD export? Copy the prompt below, give the AI the drawing and the prompt, and save the code it returns as a file ending in .svg. Already have a finished SVG? Skip to step 2.",
    anchor: "step-1",
  },
  {
    title: "Add the markers",
    body: "Rooms, flats and parking bays are marked by invisible shapes in the file. Three short prompts, one at a time: rooms, then flats, then parking bays (skip the kinds the drawing does not have). Then press “Build the finished SVG” in the tool right below them — it puts the AI's blocks into your file without touching the drawing.",
    anchor: "step-2",
  },
  {
    title: "Check the file",
    body: "Drop the SVG into the checker. It says whether a phone will draw it cleanly, shows a live preview on the blue sheet and lists the rooms, flats and bays it found. If it flags something, copy the message back to the AI.",
    anchor: "step-3",
  },
  {
    title: "Fix anything that is wrong (only if needed)",
    body: "A typo in a label, a plan that must be mirrored, a heavy file? Use the prompt in step 4 and describe the exact change. A marker in the wrong place is better fixed by hand later, in the plan editor — you never redo the file.",
    anchor: "step-4",
  },
  {
    title: "Upload it",
    body: "Open the Control panel tab. Pick the project: the Garage / Floor / Roof plans are what website visitors see, and “Client app plans & parking bays” holds the plans owners see (ground floor, typical floor). Choose the SVG — its rooms, flats and parking bays are read automatically; fix any by hand. A single flat's own plan is set from Distribution (step 6) or Admin → Properties → the flat → Layout image. The same rules are checked on upload, so a plan that would glitch on phones is refused with the reason.",
    link: { href: "/admin/settings/blueprint-ai/control", label: "Open the Control panel" },
  },
  {
    title: "Give it to the right people",
    body: "Open the Distribution tab. Choose the project, then who it is for: each client (which plan they get, whether they see it, their own plan, how it sits in their app), the parking bays (who holds each one), or website visitors. The preview shows what they will see before you save.",
    link: { href: "/admin/settings/blueprint-ai/distribution", label: "Open Distribution" },
  },
];

/** The two marker rules (rooms; flats + parking), taken straight out of RULES so the three prompts can never disagree about the marker format. */
const MARKER_RULES = (() => {
  const i12 = RULES.indexOf("12. ROOM MARKERS");
  const i13 = RULES.indexOf("13. FLAT AND PARKING MARKERS");
  const i14 = RULES.indexOf("14. ORIENTATION");
  const strip = (s: string) => s.trim().replace(/^1[23]\.\s*/, "");
  return { rooms: strip(RULES.slice(i12, i13)), flatsParking: strip(RULES.slice(i13, i14)) };
})();

export type MarkerKind = "rooms" | "flats" | "parking";

/** Plain labels for the three marker prompts — shown on the Blueprint AI page. */
export const MARKER_KIND_INFO: Record<MarkerKind, { title: string; when: string; groupId: string; notesHint: string }> = {
  rooms: {
    title: "Rooms",
    when: "Bedroom, kitchen, balcony… (and lift, stair, lobby on a whole floor) become the room buttons.",
    groupId: "rooms",
    notesHint: "e.g. the small room beside the kitchen is the servant room",
  },
  flats: {
    title: "Flats",
    when: "Flat A, B, C… outlines on a whole-floor drawing.",
    groupId: "flats",
    notesHint: "e.g. the flats are A, B and C; A is top left",
  },
  parking: {
    title: "Parking bays",
    when: "P-01, P-02… on a parking level or ground floor.",
    groupId: "parking",
    notesHint: "e.g. bays are P-01 to P-18, numbered from the gate",
  },
};

/** Pulls just the lines of rule 13 that belong to flats or to parking, so each short prompt carries only its own rules. */
function flatParkingRule(kind: "flats" | "parking"): string {
  const lines = MARKER_RULES.flatsParking.split("\n");
  const mine = kind === "flats" ? /id="flats"|data-flat =|The flat polygon/ : /id="parking"|data-parking =/;
  const kept = lines.filter((line, i) => i === 0 || mine.test(line) || /^\s*•\s*Same rules/.test(line));
  // This prompt's answer is the code block only, so the "say so before the code" instruction moves to the one line after it.
  return kept.join("\n").replace("and tell the admin in one line before the code", "and say so in the one line after the code block");
}

/**
 * Prompts 2a / 2b / 2c — a plan that is ALREADY finished needs its invisible markers, one kind per prompt, so each run is small and the
 * AI never runs out of room (rooms, then flats, then parking bays). Each answer is ONLY its marker group — never the whole SVG again —
 * and the admin puts the pieces together with the "put the pieces together" tool on the same page. The drawing is never touched.
 */
export function markersPrompt(kind: MarkerKind, notes: string): string {
  const info = MARKER_KIND_INFO[kind];
  const rule = kind === "rooms" ? MARKER_RULES.rooms : flatParkingRule(kind);
  const extra = notes.trim() ? `\nNOTES FROM ME (use them to name things correctly, never to change anything):\n${notes.trim()}\n` : "";
  const noun = kind === "rooms" ? "rooms and spaces (on a whole-floor drawing: the flats' outlines, lift, stair and lobby too)" : kind === "flats" ? "flats" : "parking bays";

  return `You are an architectural draftsperson for a real-estate app's "blueprint" screen. I attach a FINISHED floor-plan SVG. The drawing is already correct. Your ONLY job is to write the invisible marker group for its ${noun}, so the app can find them by itself when the file is uploaded.

HOW YOU ANSWER — keep it short:
1. Output ONLY the marker group <g id="${info.groupId}"> … </g> in ONE code block. Do NOT repeat the SVG and do NOT write any other part of it.
2. After the code block, ONE short line naming the markers you were unsure about, so I can check those first. Nothing else.

THE DRAWING IS DONE — DO NOT CHANGE IT:
• You are not editing the SVG, only reading it. Do not suggest fixes. If you think something is wrong, ignore it; I will fix it myself.
• Read positions from the drawing's real coordinates (its paths and lines). Write every point in the same coordinate system as the viewBox, as absolute numbers. If the drawing sits inside a <g transform="…">, convert the points so they still land on the right place in viewBox coordinates.
• Markers are invisible (fill="none" stroke="none"), straight-line polygons, never overlapping each other, never spilling outside the walls.
${extra}
MARKER RULES — follow every one:
${rule}

SELF-CHECK before answering: only the <g id="${info.groupId}"> block is in your answer · every marker has its name (${kind === "rooms" ? "and data-room-type" : kind === "flats" ? "data-flat" : "data-parking"}) · no overlaps · the count matches what the drawing shows · points are in viewBox coordinates.`;
}

/**
 * Puts the marker groups the AI returned into the finished SVG, just before its final </svg>. The drawing itself is not touched; a group
 * whose id is already in the file is refused (the markers there are kept) so nothing is ever doubled.
 */
export function mergeMarkerGroups(svg: string, blocks: string[]): { svg?: string; error?: string; added: string[] } {
  const base = svg.trim();
  const close = base.toLowerCase().lastIndexOf("</svg>");
  if (close < 0) return { error: "The SVG has no closing </svg> tag.", added: [] };
  const cleaned: string[] = [];
  const added: string[] = [];
  for (const raw of blocks) {
    const text = raw.replace(/```[a-z]*\n?/gi, "").trim();
    if (!text) continue;
    const id = text.match(/<g\b[^>]*\bid\s*=\s*["'](rooms|flats|parking)["']/i)?.[1]?.toLowerCase();
    if (!id) return { error: 'A pasted block does not start with <g id="rooms">, <g id="flats"> or <g id="parking">.', added: [] };
    if (new RegExp(`<g\b[^>]*\bid\s*=\s*["']${id}["']`, "i").test(base)) return { error: `The SVG already has a "${id}" group. Remove it from the SVG first if you want to replace it.`, added: [] };
    if (!/<\/g>\s*$/i.test(text)) return { error: `The "${id}" block seems cut off — it must end with </g>. Ask the AI to give the whole block again.`, added: [] };
    cleaned.push(text);
    added.push(id);
  }
  if (cleaned.length === 0) return { error: "Paste at least one marker block.", added: [] };
  return { svg: `${base.slice(0, close)}\n${cleaned.join("\n")}\n${base.slice(close)}`, added };
}
