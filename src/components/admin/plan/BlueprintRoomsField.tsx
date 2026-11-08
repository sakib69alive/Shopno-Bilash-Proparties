"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MousePointerClick, Plus, RotateCcw, RotateCw, Sparkles, Square, Trash2, Undo2, Waypoints, X } from "lucide-react";
import { AdminImageField } from "@/components/admin/settings/AdminImageField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  BUILDING_PRESETS,
  FLAT_PRESETS,
  ROOM_TYPES,
  ROOM_TYPE_LABEL,
  extractAreasFromSvg,
  extractRoomsFromSvg,
  doorsOf,
  guessRoomType,
  isDoorType,
  isRoomType,
  nextAreaLabel,
  polygonCentroid,
  pressableRooms,
  rectFromCorners,
  rotateFraction,
  roomSummary,
  svgAspect,
  type FlatOutline,
  type PlanRoom,
  type PlanRooms,
  type RoomPreset,
  type RoomType,
} from "@/lib/planRooms";
import { normalizeBlueprintSvg, rotateBlueprintSvg } from "@/lib/svgNormalize";
import { pickFlatMarker } from "@/lib/unitPlan";

// Doors are made with their own two-click buttons, not picked as a "kind" of room.
const TYPE_OPTIONS = ROOM_TYPES.filter((t) => !isDoorType(t)).map((t) => ({ value: t, label: ROOM_TYPE_LABEL[t].one.replace(/^./, (c) => c.toUpperCase()) }));
const TYPE_COLOR: Record<RoomType, string> = {
  flat: "#0f766e",
  bedroom: "#2563eb",
  living: "#7c3aed",
  dining: "#0891b2",
  kitchen: "#d97706",
  bathroom: "#059669",
  balcony: "#65a30d",
  servant: "#be185d",
  store: "#a16207",
  lift: "#475569",
  stair: "#9333ea",
  lobby: "#0ea5e9",
  gate: "#b45309",
  other: "#6b7280",
  maindoor: "#16a34a",
  door: "#e11d48",
};
const pointsAttr = (points: [number, number][]) => points.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");

type Mark = "room" | "outline" | "maindoor" | "door";
type DrawMode = "box" | "shape";

function RoomCanvas({
  src,
  aspect,
  rooms: allRooms,
  outline,
  draft,
  marking,
  boxMode,
  doorMode,
  onAddPoint,
  onRemovePoint,
}: {
  src: string;
  aspect: number;
  rooms: PlanRoom[];
  outline: FlatOutline | null;
  draft: [number, number][];
  marking: boolean;
  /** Two-corner box drawing: a dashed box follows the pointer after the first corner. */
  boxMode: boolean;
  /** Marking a door: two clicks (its two ends); a line follows the pointer after the first one. */
  doorMode: boolean;
  onAddPoint: (p: [number, number]) => void;
  onRemovePoint: (index: number) => void;
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const frac = (e: React.MouseEvent<HTMLDivElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }
  const preview = marking && boxMode && draft.length === 1 && hover ? rectFromCorners(draft[0], hover) : null;
  const doorPreview = marking && doorMode && draft.length === 1 && hover ? [draft[0], hover] : null;
  const rooms = pressableRooms(allRooms);
  const doors = doorsOf(allRooms);
  return (
    <div
      onClick={(e) => marking && onAddPoint(frac(e))}
      onMouseMove={(e) => marking && (boxMode || doorMode) && setHover(frac(e))}
      onMouseLeave={() => setHover(null)}
      style={{ aspectRatio: String(aspect) }}
      className={cn("border-border relative w-full overflow-hidden rounded-lg border bg-white select-none", marking && "ring-accent cursor-crosshair ring-2")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img: the drawing being marked */}
      <img src={src} alt="" draggable={false} className="absolute inset-0 size-full object-contain" />
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        {outline && <polygon points={pointsAttr(outline.points)} fill="rgb(37 99 235 / 0.05)" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />}
        {rooms.map((r) => (
          <polygon key={r.id} points={pointsAttr(r.points)} fill={TYPE_COLOR[r.type]} fillOpacity={0.3} stroke={TYPE_COLOR[r.type]} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ))}
        {doors.map((d) => (
          <g key={`door-${d.id}`} strokeLinecap="round">
            <line x1={d.points[0][0] * 100} y1={d.points[0][1] * 100} x2={d.points[1][0] * 100} y2={d.points[1][1] * 100} stroke={TYPE_COLOR[d.type]} strokeOpacity={0.35} strokeWidth={11} vectorEffect="non-scaling-stroke" />
            <line x1={d.points[0][0] * 100} y1={d.points[0][1] * 100} x2={d.points[1][0] * 100} y2={d.points[1][1] * 100} stroke={TYPE_COLOR[d.type]} strokeWidth={5} vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {doorPreview && <line x1={doorPreview[0][0] * 100} y1={doorPreview[0][1] * 100} x2={doorPreview[1][0] * 100} y2={doorPreview[1][1] * 100} stroke="#2563eb" strokeWidth={4} strokeDasharray="6 4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        {preview && <polygon points={pointsAttr(preview)} fill="rgb(37 99 235 / 0.15)" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
        {!boxMode && !doorMode && draft.length > 0 && <polyline points={pointsAttr(draft)} fill="rgb(37 99 235 / 0.15)" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
      </svg>
      {rooms.map((r) => {
        const [cx, cy] = polygonCentroid(r.points);
        return (
          <span key={`l-${r.id}`} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap text-white shadow" style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, backgroundColor: TYPE_COLOR[r.type] }}>
            {r.label}
          </span>
        );
      })}
      {/* Click a corner to remove just that one; Ctrl+Z removes the last. */}
      {draft.map(([x, y], i) => (
        <button
          key={i}
          type="button"
          aria-label={`Remove corner ${i + 1}`}
          title="Click to remove this corner"
          onClick={(e) => {
            e.stopPropagation();
            onRemovePoint(i);
          }}
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-blue-600 shadow transition-colors hover:bg-red-600"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
    </div>
  );
}

/**
 * A blueprint upload that also knows its AREAS — the buttons visitors press on the public site.
 *
 *  `preset="flat"` (a flat's own plan): the areas are its rooms — Bedroom, Kitchen, Bathroom, Balcony, Servant room…
 *  `preset="building"` (a project's floor plan): the areas are Flat A/B/C, Lift, Stair, Lobby.
 *
 * Marking is one press: press "+ Bedroom", click two opposite corners (or the corners of an odd shape), done — it is named and numbered
 * for you (Bedroom 1, then Bedroom 2…). Names stay editable. Other things this field does:
 *  • The moment an SVG is chosen it is FIT to the app (turned upright if its lettering shows it is sideways, trimmed of empty margins;
 *    the server runs the same code). Turn buttons cover the rare drawing it could not judge.
 *  • An SVG with markers (the Blueprint AI prompt adds them) has its areas found instantly — nothing to mark.
 *  • For a drawing of a WHOLE FLOOR on a unit page, mark this flat's outline (or let a data-flat marker do it): the unit page shows only this flat.
 * Areas and outline travel with the form in hidden fields; the server re-reads markers from a freshly uploaded SVG if a field is empty.
 */
export function BlueprintRoomsField({
  label,
  name,
  removeName,
  roomsName,
  outlineName,
  preset = "flat",
  currentSrc,
  initial,
  initialOutline,
  helperText,
}: {
  label: string;
  name: string;
  removeName?: string;
  roomsName: string;
  /** Hidden field that carries "this flat's outline on a whole-floor drawing" (units only). */
  outlineName?: string;
  preset?: "flat" | "building";
  currentSrc?: string;
  initial?: PlanRooms;
  initialOutline?: FlatOutline;
  helperText?: string;
}) {
  const presets = preset === "building" ? BUILDING_PRESETS : FLAT_PRESETS;
  const noun = preset === "building" ? "flats, lift and stairs" : "rooms";
  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null); // the fixed SVG of a freshly chosen/turned file
  const [aspect, setAspect] = useState<number | null>(initial?.aspect ?? initialOutline?.aspect ?? null);
  const [rooms, setRooms] = useState<PlanRoom[]>(initial?.rooms ?? []);
  const [outline, setOutline] = useState<FlatOutline | null>(initialOutline ?? null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [fixes, setFixes] = useState<string[]>([]);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [mark, setMark] = useState<Mark | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("box");
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [busy, setBusy] = useState(false);

  const shown = previewSrc ?? currentSrc ?? null;
  const marking = mark !== null;
  const doorMode = mark === "maindoor" || mark === "door";
  const boxMode = drawMode === "box" && marking && !doorMode;

  // Ctrl+Z (Cmd+Z) takes back the last corner while marking; Esc cancels.
  useEffect(() => {
    if (!marking) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setDraft((d) => d.slice(0, -1));
      } else if (e.key === "Escape") {
        setDraft([]);
        setMark(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [marking]);

  function fileInput(): HTMLInputElement | null {
    return rootRef.current?.querySelector<HTMLInputElement>(`input[type="file"][name="${name}"]`) ?? null;
  }

  /** Puts the fixed SVG into the form's file input, so the saved file is exactly the one shown here. */
  function putFile(svg: string, fileName: string) {
    const input = fileInput();
    if (!input) return;
    try {
      const dt = new DataTransfer();
      dt.items.add(new File([svg], fileName, { type: "image/svg+xml" }));
      input.files = dt.files;
    } catch {
      // Older browsers: the server applies the same fix on upload, so nothing is lost.
    }
  }

  function showSvg(svg: string, fileName: string, replaceInput: boolean) {
    if (replaceInput) putFile(svg, fileName);
    setSvgText(svg);
    setPreviewSrc((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    });
    setAspect(svgAspect(svg));
  }

  function formValue(fieldName: string): string {
    const form = rootRef.current?.closest("form");
    return (form?.querySelector<HTMLInputElement>(`[name="${fieldName}"]`)?.value ?? "").trim();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLElement>) {
    const input = e.target as HTMLInputElement;
    if (input.type !== "file" || input.name !== name) return;
    const file = input.files?.[0];
    setMark(null);
    setDraft([]);
    setFixes([]);
    if (!file) {
      setPreviewSrc(null);
      setSvgText(null);
      setAspect(initial?.aspect ?? initialOutline?.aspect ?? null);
      setRooms(initial?.rooms ?? []);
      setOutline(initialOutline ?? null);
      setNote(null);
      return;
    }
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    if (!isSvg) {
      // A picture: its proportions come from loading it. It cannot carry markers and is not turned automatically.
      const url = URL.createObjectURL(file);
      setPreviewSrc(url);
      setSvgText(null);
      const img = new Image();
      img.onload = () => setAspect(img.naturalWidth / img.naturalHeight);
      img.src = url;
      setRooms([]);
      setOutline(null);
      setNote({ ok: false, text: `A picture has no markers. Mark the ${noun} below — press a button, then click two corners.` });
      return;
    }

    const fixed = normalizeBlueprintSvg(await file.text());
    setFixes(fixed.notes);
    showSvg(fixed.svg, file.name, fixed.notes.length > 0);

    const found = extractRoomsFromSvg(fixed.svg);
    setRooms(found?.rooms ?? []);
    let outlineNote = "";
    if (outlineName) {
      const areas = extractAreasFromSvg(fixed.svg);
      const floorRaw = parseInt(formValue("floor"), 10);
      const mine = areas ? pickFlatMarker(areas.areas, formValue("unitNumber"), Number.isFinite(floorRaw) ? floorRaw : undefined) : undefined;
      setOutline(areas && mine ? { aspect: areas.aspect, points: mine.points } : null);
      if (areas && mine) outlineNote = ` This flat's outline (${mine.key}) was found too — the unit page will show only this flat.`;
    }
    setNote(
      found
        ? { ok: true, text: `Found ${found.rooms.length} ${found.rooms.length === 1 ? "area" : "areas"} in the file (${roomSummary(found.rooms).map((s) => s.text).join(", ")}).${outlineNote} Check them below.` }
        : { ok: !!outlineNote, text: outlineNote ? outlineNote.trim() : `No markers in this file. Mark the ${noun} below — press a button, then click two corners — or ask the AI to add markers (Admin → Settings → Blueprint AI).` },
    );
  }

  /** A turn the admin asks for: the drawing, the areas and the outline all turn together. */
  async function turn(deg: 90 | -90 | 180) {
    if (busy) return;
    setBusy(true);
    try {
      let text = svgText;
      let fileName = "blueprint.svg";
      if (!text) {
        if (!currentSrc || !/\.svg(\?|$)/i.test(currentSrc)) return;
        const res = await fetch(currentSrc);
        if (!res.ok) return;
        text = await res.text();
        fileName = currentSrc.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "") || fileName;
      } else {
        fileName = fileInput()?.files?.[0]?.name ?? fileName;
      }
      const turned = rotateBlueprintSvg(text, deg);
      showSvg(turned, fileName, true);
      setRooms((all) => all.map((r) => ({ ...r, points: r.points.map((p) => rotateFraction(p, deg)) })));
      setOutline((o) => (o ? { aspect: deg === 180 ? o.aspect : 1 / o.aspect, points: o.points.map((p) => rotateFraction(p, deg)) } : o));
      setFixes((f) => [...f, deg === 180 ? "Turned half a turn." : `Turned a quarter turn ${deg === 90 ? "clockwise" : "anticlockwise"}.`]);
    } finally {
      setBusy(false);
    }
  }

  /** One press: the next free name and the right kind are filled in, and marking starts. Flats are usually L-shaped, so they default to the many-corner shape. */
  function startPreset(p: RoomPreset) {
    setRoomName(nextAreaLabel(p, rooms.map((r) => r.label)));
    setRoomType(p.type);
    setDrawMode(p.type === "flat" || p.type === "lobby" ? "shape" : "box");
    setDraft([]);
    setMark("room");
  }

  function startOther() {
    setRoomName("");
    setRoomType(null);
    setDraft([]);
    setMark("room");
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function commit(points: [number, number][]) {
    if (points.length < 3) return;
    if (mark === "outline" && aspect) {
      setOutline({ aspect, points });
    } else if (mark === "room") {
      const labelText = roomName.trim();
      if (!labelText) return;
      const type: RoomType = roomType ?? guessRoomType(labelText);
      setRooms((all) => [...all, { id: `room-${Date.now().toString(36)}-${all.length}`, label: labelText, type, points }]);
      setRoomName("");
      setRoomType(null);
    }
    setDraft([]);
    setMark(null);
  }

  /** A door is just two points — its two ends. The second click adds it. */
  function commitDoor(a: [number, number], b: [number, number]) {
    if (mark !== "maindoor" && mark !== "door") return;
    const existing = doorsOf(rooms).filter((d) => d.type === mark).length;
    const label = mark === "maindoor" ? (existing === 0 ? "Main door" : `Main door ${existing + 1}`) : `Door ${existing + 1}`;
    setRooms((all) => [...all, { id: `door-${Date.now().toString(36)}-${all.length}`, label, type: mark, points: [a, b] }]);
    setDraft([]);
    setMark(null);
  }

  function addPoint(p: [number, number]) {
    if (doorMode) {
      if (draft.length === 0) setDraft([p]);
      else commitDoor(draft[0], p);
      return;
    }
    if (drawMode === "box") {
      if (draft.length === 0) setDraft([p]);
      else commit(rectFromCorners(draft[0], p));
    } else {
      setDraft((d) => [...d, p]);
    }
  }

  const plan: PlanRooms | null = aspect && rooms.length > 0 ? { aspect, rooms } : null;
  const canTurn = Boolean(svgText || (currentSrc && /\.svg(\?|$)/i.test(currentSrc)));

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <div onChange={onFileChange}>
        <AdminImageField label={label} name={name} removeName={removeName} currentSrc={currentSrc} helperText={helperText} allowSvg />
      </div>
      <input type="hidden" name={roomsName} value={plan ? JSON.stringify(plan) : ""} />
      {outlineName && <input type="hidden" name={outlineName} value={outline ? JSON.stringify(outline) : ""} />}

      {shown && aspect && (
        <div className="bg-surface border-border flex flex-col gap-3 rounded-lg border p-3">
          {fixes.length > 0 && (
            <p role="status" className="text-body-sm bg-success-soft text-success flex items-start gap-2 rounded-md px-3 py-2">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>Fixed automatically so it fits the app: {fixes.join(" ")}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-caption text-fg-muted">Not the right way up?</p>
            <Button type="button" variant="ghost" size="sm" disabled={!canTurn || busy} onClick={() => turn(-90)}>
              <RotateCcw aria-hidden className="size-4" />
              Turn left
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!canTurn || busy} onClick={() => turn(90)}>
              <RotateCw aria-hidden className="size-4" />
              Turn right
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={!canTurn || busy} onClick={() => turn(180)}>
              Flip over
            </Button>
            {!canTurn && <span className="text-caption text-fg-subtle">Only an SVG can be turned.</span>}
          </div>

          <div>
            <p className="text-body-sm text-fg font-semibold">{preset === "building" ? "Flats, lift and stairs on this plan" : "Rooms on this plan"}</p>
            <p className="text-caption text-fg-muted mt-0.5">
              These become the buttons visitors press on the public site — pressed ones lift off the plan, get darker and bolder while the rest fades. They are filled in
              automatically from an SVG that has markers; otherwise press a button below and click the plan.
            </p>
          </div>

          {note && (
            <p role="status" className={cn("text-body-sm flex items-start gap-2 rounded-md px-3 py-2", note.ok ? "bg-success-soft text-success" : "bg-surface-raised text-fg-muted")}>
              {note.ok && <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />}
              {note.text}
            </p>
          )}

          {/* One-press marking */}
          <div className="flex flex-wrap items-center gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={marking}
                onClick={() => startPreset(p)}
                className="border-border-strong bg-surface-raised text-body-sm hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors disabled:opacity-50"
              >
                <Plus aria-hidden className="size-3.5" />
                {p.label}
              </button>
            ))}
            <button type="button" disabled={marking} onClick={startOther} className="text-fg-muted hover:text-fg text-body-sm px-2 py-1.5 font-semibold disabled:opacity-50">
              Other…
            </button>
          </div>

          {/* Doors: two clicks, one at each end of the door. */}
          <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-md border p-3">
            <p className="text-body-sm text-fg font-semibold">Doors — just two clicks each</p>
            <p className="text-caption text-fg-muted">
              Press a button, then click <b>one end of the door</b> and <b>the other end</b>. The <b>main door</b> is shown in green at all times; a <b>room door</b> is shown in pink while that
              room is pressed. An SVG can carry them too: <code>data-door=&quot;main&quot;</code> or <code>data-door=&quot;room&quot;</code> on a line.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={marking} onClick={() => { setDraft([]); setMark("maindoor"); }} className="inline-flex items-center gap-2 rounded-full border-2 border-[#16a34a] bg-surface-raised px-3.5 py-1.5 text-body-sm font-semibold text-[#15803d] transition-colors hover:bg-[#16a34a]/10 disabled:opacity-50">
                <span aria-hidden className="size-2.5 rounded-full bg-[#16a34a]" />
                Main door of the flat
              </button>
              <button type="button" disabled={marking} onClick={() => { setDraft([]); setMark("door"); }} className="inline-flex items-center gap-2 rounded-full border-2 border-[#e11d48] bg-surface-raised px-3.5 py-1.5 text-body-sm font-semibold text-[#be123c] transition-colors hover:bg-[#e11d48]/10 disabled:opacity-50">
                <span aria-hidden className="size-2.5 rounded-full bg-[#e11d48]" />
                Door of a room
              </button>
            </div>
          </div>

          {marking && doorMode && (
            <div className="border-accent/40 bg-accent-soft/40 flex flex-wrap items-center gap-3 rounded-md border p-3">
              <p className="text-body-sm text-fg flex-1 basis-64 font-medium">
                <span aria-hidden className="mr-2 inline-block size-2.5 rounded-full align-middle" style={{ backgroundColor: mark === "maindoor" ? "#16a34a" : "#e11d48" }} />
                {draft.length === 0 ? `Step 1 of 2 — click ONE END of the ${mark === "maindoor" ? "main door" : "room door"}.` : "Step 2 of 2 — click the OTHER END of the door. It is added at once."}
              </p>
              <Button type="button" variant="ghost" disabled={draft.length === 0} onClick={() => setDraft([])}>
                <Undo2 aria-hidden className="size-4" />
                Redo first point
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setDraft([]); setMark(null); }}>
                <X aria-hidden className="size-4" />
                Cancel
              </Button>
            </div>
          )}

          {marking && !doorMode && (
            <div className="border-accent/40 bg-accent-soft/40 flex flex-col gap-3 rounded-md border p-3">
              <div className="flex flex-wrap items-end gap-3">
                {mark === "room" && (
                  <div className="w-52">
                    <Input ref={nameRef} label="Name" value={roomName} onChange={(e) => setRoomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder="e.g. Master bedroom" />
                  </div>
                )}
                {mark === "room" && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-label text-fg-muted">Kind</span>
                    <select
                      value={roomType ?? "auto"}
                      onChange={(e) => setRoomType(isRoomType(e.target.value) ? e.target.value : null)}
                      className="border-border-strong bg-surface-raised text-body h-11 rounded-md border px-3"
                    >
                      <option value="auto">Auto (from name)</option>
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-muted">Draw as</span>
                  <div className="border-border-strong bg-surface-raised inline-flex overflow-hidden rounded-md border">
                    <button type="button" onClick={() => { setDrawMode("box"); setDraft([]); }} className={cn("inline-flex h-11 items-center gap-1.5 px-3 text-sm font-semibold", drawMode === "box" ? "bg-accent text-accent-foreground" : "text-fg-muted")}>
                      <Square aria-hidden className="size-4" />
                      Box (2 clicks)
                    </button>
                    <button type="button" onClick={() => { setDrawMode("shape"); setDraft([]); }} className={cn("inline-flex h-11 items-center gap-1.5 px-3 text-sm font-semibold", drawMode === "shape" ? "bg-accent text-accent-foreground" : "text-fg-muted")}>
                      <Waypoints aria-hidden className="size-4" />
                      Shape (many corners)
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {drawMode === "shape" && (
                  <Button type="button" onClick={() => commit(draft)} disabled={draft.length < 3 || (mark === "room" && !roomName.trim())}>
                    <Check aria-hidden className="size-4" />
                    Finish ({draft.length} corners)
                  </Button>
                )}
                <Button type="button" variant="ghost" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
                  <Undo2 aria-hidden className="size-4" />
                  Undo
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setDraft([]); setMark(null); }}>
                  <X aria-hidden className="size-4" />
                  Cancel
                </Button>
              </div>
              <p className="text-caption text-accent">
                {drawMode === "box"
                  ? `Click one corner of ${mark === "outline" ? "this flat" : `“${roomName.trim() || "the area"}”`}, then the opposite corner — it is added at once.`
                  : `Click the corners of ${mark === "outline" ? "this flat" : `“${roomName.trim() || "the area"}”`} one after another around its edge, then press Finish.`}{" "}
                Click a corner to remove it · Ctrl+Z undoes the last · Esc cancels.
              </p>
            </div>
          )}

          {outlineName && (
            <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-md border p-3">
              <p className="text-body-sm text-fg font-semibold">Is this a drawing of the whole floor?</p>
              <p className="text-caption text-fg-muted">
                Then mark where THIS flat is (dashed blue line). The unit page will show only this flat — as if it had its own plan — and only the rooms inside it. An SVG with a
                <code className="mx-1">data-flat</code> marker for this flat does it automatically.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {!marking && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setDraft([]); setDrawMode("shape"); setMark("outline"); }}>
                    <MousePointerClick aria-hidden className="size-4" />
                    {outline ? "Redraw this flat's outline" : "Mark this flat's outline"}
                  </Button>
                )}
                {outline && !marking && (
                  <>
                    <span className="text-caption text-success">Outline set — only this flat will show.</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOutline(null)}>
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          <RoomCanvas src={shown} aspect={aspect} rooms={rooms} outline={outline} draft={draft} marking={marking} boxMode={boxMode} doorMode={doorMode} onAddPoint={addPoint} onRemovePoint={(i) => setDraft((d) => d.filter((_, k) => k !== i))} />

          {rooms.length > 0 ? (
            <>
              <p className="text-caption text-fg-muted">{roomSummary(rooms).map((s) => s.text).join(" · ")}</p>
              <ul className="flex flex-col gap-2">
                {rooms.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLOR[r.type] }} />
                    {isDoorType(r.type) ? (
                      <span className="text-body-sm min-w-0 flex-1 font-medium">
                        {r.label} <span className="text-fg-subtle text-xs">· {r.type === "maindoor" ? "shown in green all the time" : "shown in pink when its room is pressed"}</span>
                      </span>
                    ) : (
                      <>
                        <input
                          aria-label="Name"
                          value={r.label}
                          onChange={(e) => setRooms((all) => all.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          className="border-border-strong bg-surface-raised text-body-sm h-9 min-w-0 flex-1 rounded-md border px-2.5"
                        />
                        <select
                          aria-label="Kind"
                          value={r.type}
                          onChange={(e) => isRoomType(e.target.value) && setRooms((all) => all.map((x) => (x.id === r.id ? { ...x, type: e.target.value as RoomType } : x)))}
                          className="border-border-strong bg-surface-raised text-body-sm h-9 rounded-md border px-2"
                        >
                          {TYPE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    <button type="button" aria-label={`Delete ${r.label}`} onClick={() => setRooms((all) => all.filter((x) => x.id !== r.id))} className="text-fg-muted hover:bg-surface-raised flex size-9 items-center justify-center rounded-md">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div>
                <Button type="button" variant="ghost" onClick={() => { setRooms([]); setNote(null); }}>
                  Remove all
                </Button>
              </div>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle">Nothing marked yet — visitors will see the plain plan, exactly as uploaded.</p>
          )}
        </div>
      )}
    </div>
  );
}
