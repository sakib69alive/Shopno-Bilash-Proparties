"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, MousePointerClick, Plus, Square, Waypoints, RotateCcw, RotateCw, Sparkles, Trash2, Undo2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { rotateFloorPlanImageAction, saveFloorPlansAction, uploadFloorPlanImageAction } from "@/features/projects/floorPlanActions";
import { FLAT_PRESETS, NEUTRAL_VIEW, guessRoomType, nextAreaLabel, rectFromCorners, rotateFraction, type PlanRoom, type PlanView, type RoomPreset, type RoomType } from "@/lib/planRooms";
import { ClientPlanPreview } from "@/components/admin/projects/ClientPlanPreview";
import type { BuildingFloorPlan, FlatArea } from "@/types/project";

interface EditorPlan {
  key: string;
  id: string;
  name: string;
  image: string;
  aspect: number;
  /** What the admin typed: "0", "1-4", "1,2,5" — empty means every floor no other plan claims. */
  floorsText: string;
  areas: FlatArea[];
  /** Rooms (bedroom, kitchen…) — the client app shows the ones inside an owner's flat as room buttons. */
  rooms: PlanRoom[];
  /** The admin's own tilt / zoom / shift of the plan on the client app. */
  view: PlanView;
  /** Zoom / shift of one flat on the Home card — set in Blueprint AI → Distribution; carried through here so saving this editor never drops it. */
  homeView?: PlanView;
}

let counter = 0;
const newKey = () => `plan-${Date.now()}-${counter++}`;

const COLORS = ["#2563eb", "#d97706", "#059669", "#db2777", "#7c3aed", "#0891b2", "#65a30d", "#dc2626"];
const colorOf = (key: string) => COLORS[[...key.toUpperCase()].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];

/** "1-4", "0", "1,2,5-7" → floor numbers. null when the text isn't understood. */
function parseFloors(text: string): number[] | null {
  const t = text.trim();
  if (!t) return [];
  const out = new Set<number>();
  for (const part of t.split(/[\s,;]+/).filter(Boolean)) {
    const m = part.match(/^(-?\d+)(?:\s*[-–]\s*(-?\d+))?$/);
    if (!m) return null;
    const a = parseInt(m[1], 10);
    const b = m[2] !== undefined ? parseInt(m[2], 10) : a;
    if (b < a || b - a > 200) return null;
    for (let n = a; n <= b; n++) out.add(n);
  }
  return [...out].sort((x, y) => x - y);
}

function floorsToText(floors: number[]): string {
  if (floors.length === 0) return "";
  const parts: string[] = [];
  let start = floors[0];
  let prev = floors[0];
  for (const n of [...floors.slice(1), Number.NaN]) {
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  return parts.join(", ");
}

const pointsAttr = (points: [number, number][]) => points.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");

/** The drawing with every marked flat area on it; while a flat is being marked, each click adds a corner. */
function PlanCanvas({
  plan,
  marking,
  draft,
  boxMode,
  onAddPoint,
  onRemovePoint,
}: {
  plan: EditorPlan;
  marking: boolean;
  draft: [number, number][];
  /** Two-corner box drawing: a dashed box follows the pointer after the first corner. */
  boxMode: boolean;
  onAddPoint: (p: [number, number]) => void;
  onRemovePoint: (index: number) => void;
}) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const frac = (e: React.MouseEvent<HTMLDivElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  const preview = marking && boxMode && draft.length === 1 && hover ? rectFromCorners(draft[0], hover) : null;
  function onClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!marking) return;
    onAddPoint(frac(e));
  }
  return (
    <div
      onClick={onClick}
      onMouseMove={(e) => marking && boxMode && setHover(frac(e))}
      onMouseLeave={() => setHover(null)}
      style={{ aspectRatio: String(plan.aspect) }}
      className={cn("border-border bg-white relative w-full overflow-hidden rounded-lg border select-none", marking && "cursor-crosshair ring-accent ring-2")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img: the uploaded drawing, shown whole under the marked areas */}
      <img src={plan.image} alt={plan.name} draggable={false} className="absolute inset-0 size-full object-contain" />
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
        {plan.areas.map((a, i) => (
          <polygon key={`${a.kind ?? "flat"}-${a.key}-${i}`} points={pointsAttr(a.points)} fill={colorOf(a.key)} fillOpacity={0.28} stroke={colorOf(a.key)} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ))}
        {plan.rooms.map((r) => (
          <polygon key={`room-${r.id}`} points={pointsAttr(r.points)} fill="#0d9488" fillOpacity={0.18} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
        ))}
        {preview && <polygon points={pointsAttr(preview)} fill="rgb(37 99 235 / 0.15)" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
        {!boxMode && draft.length > 0 && <polyline points={pointsAttr(draft)} fill="rgb(37 99 235 / 0.15)" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
      </svg>
      {plan.areas.map((a, i) => {
        const cx = a.points.reduce((s, p) => s + p[0], 0) / a.points.length;
        const cy = a.points.reduce((s, p) => s + p[1], 0) / a.points.length;
        return (
          <span
            key={`l-${a.kind ?? "flat"}-${a.key}-${i}`}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow"
            style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, backgroundColor: colorOf(a.key) }}
          >
            {a.kind === "parking" ? `P ${a.key}` : a.key}
          </span>
        );
      })}
      {plan.rooms.map((r) => {
        const cx = r.points.reduce((a, p) => a + p[0], 0) / r.points.length;
        const cy = r.points.reduce((a, p) => a + p[1], 0) / r.points.length;
        return (
          <span key={`rl-${r.id}`} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-teal-600/90 px-1.5 py-0.5 text-[0.625rem] font-semibold whitespace-nowrap text-white" style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}>
            {r.label}
          </span>
        );
      })}
      {/* Corners: click a corner to take that one away (a mis-click is never stuck). Ctrl+Z removes the last one. */}
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
          className="hover:bg-red-600 absolute size-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-blue-600 shadow transition-colors"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
    </div>
  );
}

function PlanCard({ plan, projectId, update, remove }: { plan: EditorPlan; projectId: string; update: (patch: Partial<EditorPlan>) => void; remove: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"flat" | "parking" | "room">("flat");
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [drawMode, setDrawMode] = useState<"box" | "shape">("box");
  const [marking, setMarking] = useState(false);
  const [draft, setDraft] = useState<[number, number][]>([]);
  const [note, setNote] = useState<string | null>(null);

  // Ctrl+Z (Cmd+Z) takes back the last corner while marking; Esc cancels.
  useEffect(() => {
    if (!marking) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setDraft((d) => d.slice(0, -1));
      } else if (e.key === "Escape") {
        setDraft([]);
        setMarking(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [marking]);
  const floorsOk = parseFloors(plan.floorsText) !== null;

  function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.set("image", file);
      const res = await uploadFloorPlanImageAction(projectId, fd);
      if (res.error || !res.url || !res.aspect) {
        setUploadError(res.error ?? "Upload failed.");
        return;
      }
      // A new drawing has different proportions, so the old areas no longer line up — start again, unless the SVG carries its own
      // flat/parking markers (an AI-made plan does): those are read straight away.
      const found = res.areas ?? [];
      const rooms = res.rooms ?? [];
      update({ image: res.url, aspect: res.aspect, areas: found, rooms });
      const parts = [
        res.notes && res.notes.length > 0 ? `Fixed automatically so it fits the app: ${res.notes.join(" ")}` : "",
        found.length > 0 ? `Found ${found.filter((a) => a.kind !== "parking").length} flat(s) and ${found.filter((a) => a.kind === "parking").length} parking bay(s) marked in the file.` : "",
        rooms.length > 0 ? `Found ${rooms.length} room(s).` : "",
      ].filter(Boolean);
      setNote(parts.length > 0 ? `${parts.join(" ")} Check them on the drawing below.` : null);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Turn the drawing; the areas and rooms already marked turn with it so they stay on the right flats. */
  function turn(deg: 90 | -90 | 180) {
    setUploadError(null);
    startUpload(async () => {
      const res = await rotateFloorPlanImageAction(projectId, plan.image, deg);
      if (res.error || !res.url || !res.aspect) {
        setUploadError(res.error ?? "Couldn't turn the drawing.");
        return;
      }
      update({
        image: res.url,
        aspect: res.aspect,
        areas: plan.areas.map((a) => ({ ...a, points: a.points.map((p) => rotateFraction(p, deg)) })),
        rooms: plan.rooms.map((r) => ({ ...r, points: r.points.map((p) => rotateFraction(p, deg)) })),
      });
      setNote(deg === 180 ? "Turned half a turn." : `Turned a quarter turn ${deg === 90 ? "clockwise" : "anticlockwise"}.`);
    });
  }

  function commit(points: [number, number][]) {
    if (points.length < 3) return;
    if (kind === "room") {
      const label = code.trim();
      if (!label) return;
      update({ rooms: [...plan.rooms, { id: `room-${Date.now().toString(36)}-${plan.rooms.length}`, label, type: roomType ?? guessRoomType(label), points }] });
    } else {
      const key = code.trim().toUpperCase();
      if (!key) return;
      update({ areas: [...plan.areas.filter((a) => !(a.key === key && (a.kind ?? "flat") === kind)), { kind, key, points }] });
    }
    setDraft([]);
    setMarking(false);
    setCode("");
    setRoomType(null);
  }

  function addPoint(p: [number, number]) {
    if (drawMode === "box") {
      if (draft.length === 0) setDraft([p]);
      else commit(rectFromCorners(draft[0], p));
    } else {
      setDraft((d) => [...d, p]);
    }
  }

  /** One press: the next free name is filled in (flat letter, parking number, "Bedroom 2"…) and marking starts. Flats are often L-shaped, so they default to the many-corner shape. */
  function startFlat() {
    const used = new Set(plan.areas.filter((a) => (a.kind ?? "flat") === "flat").map((a) => a.key.toUpperCase()));
    let letter = "A";
    for (let i = 0; i < 26; i++) {
      letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) break;
    }
    setKind("flat");
    setCode(letter);
    setRoomType(null);
    setDrawMode("shape");
    setDraft([]);
    setMarking(true);
  }
  function startParking() {
    const max = plan.areas.filter((a) => a.kind === "parking").reduce((m, a) => Math.max(m, parseInt(a.key.match(/(\d+)\s*$/)?.[1] ?? "0", 10)), 0);
    setKind("parking");
    setCode(`P-${String(max + 1).padStart(2, "0")}`);
    setRoomType(null);
    setDrawMode("box");
    setDraft([]);
    setMarking(true);
  }
  function startRoom(p: RoomPreset | null) {
    setKind("room");
    setCode(p ? nextAreaLabel(p, plan.rooms.map((r) => r.label)) : "");
    setRoomType(p?.type ?? null);
    setDrawMode("box");
    setDraft([]);
    setMarking(true);
  }
  const cancelMarking = () => {
    setDraft([]);
    setMarking(false);
  };

  return (
    <fieldset className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4">
      <legend className="text-caption text-fg-subtle px-1 uppercase">Floor plan</legend>

      <div className="grid gap-4 sm:grid-cols-[1fr_16rem]">
        <Input label="Name" value={plan.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Typical floor, Ground floor, Penthouse" />
        <Input
          label="Floors"
          value={plan.floorsText}
          onChange={(e) => update({ floorsText: e.target.value })}
          placeholder="empty = all other floors"
          error={floorsOk ? undefined : "Use numbers like 0, 1-4 or 1,2,5"}
          helperText="Ground floor is 0. Leave empty for the typical plan."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
          <Upload aria-hidden className="size-4" />
          {plan.image ? "Replace drawing" : "Upload the full floor drawing"}
        </Button>
        <span className="text-caption text-fg-subtle">SVG (best) or a JPG/PNG of the whole floor.</span>
        <div className="ml-auto">
          <Button type="button" variant="ghost" onClick={remove}>
            <Trash2 aria-hidden className="size-4" />
            Remove plan
          </Button>
        </div>
      </div>
      {uploadError && (
        <p role="alert" className="text-error text-body-sm whitespace-pre-line">
          {uploadError}
        </p>
      )}

      {plan.image && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="bg-bg border-border flex flex-col gap-3 rounded-lg border p-3">
            <p className="text-body-sm text-fg-muted">
              <b>Mark the plan in one press.</b> Press <b>+ Flat</b>, <b>+ Parking bay</b> or a room (<b>+ Bedroom</b>, <b>+ Kitchen</b>…) — its name or number is filled in for you (Flat A, then Flat B; P-01, then P-02; Bedroom 1, then
              Bedroom 2). Then click two opposite corners for a box, or switch to <b>Shape</b> for an L-shaped flat. A wrong corner? Click it, or press <b>Ctrl+Z</b>. An SVG that already carries flat, parking and room markers (the Blueprint AI
              prompt adds them) is filled in automatically when you upload it.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-caption text-fg-muted">Not the right way up?</span>
              <Button type="button" variant="ghost" size="sm" disabled={uploading || !/\.svg$/i.test(plan.image)} onClick={() => turn(-90)}>
                <RotateCcw aria-hidden className="size-4" />
                Turn left
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={uploading || !/\.svg$/i.test(plan.image)} onClick={() => turn(90)}>
                <RotateCw aria-hidden className="size-4" />
                Turn right
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={uploading || !/\.svg$/i.test(plan.image)} onClick={() => turn(180)}>
                Flip over
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={marking} onClick={startFlat} className="border-border-strong bg-surface-raised text-body-sm hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors disabled:opacity-50">
                <Plus aria-hidden className="size-3.5" />
                Flat
              </button>
              <button type="button" disabled={marking} onClick={startParking} className="border-border-strong bg-surface-raised text-body-sm hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors disabled:opacity-50">
                <Plus aria-hidden className="size-3.5" />
                Parking bay
              </button>
              <span aria-hidden className="bg-border mx-1 h-5 w-px" />
              {FLAT_PRESETS.map((p) => (
                <button key={p.label} type="button" disabled={marking} onClick={() => startRoom(p)} className="border-border-strong bg-surface-raised text-body-sm hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors disabled:opacity-50">
                  <Plus aria-hidden className="size-3.5" />
                  {p.label}
                </button>
              ))}
              <button type="button" disabled={marking} onClick={() => startRoom(null)} className="text-fg-muted hover:text-fg text-body-sm px-2 py-1.5 font-semibold disabled:opacity-50">
                Other room…
              </button>
            </div>
            {marking && (
              <div className="border-accent/40 bg-accent-soft/40 flex flex-col gap-3 rounded-md border p-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-52">
                    <Input
                      label={kind === "parking" ? "Space number" : kind === "room" ? "Room name" : "Flat code"}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={kind === "parking" ? "P-01" : kind === "room" ? "Master bedroom" : "A"}
                    />
                  </div>
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
                    <Button type="button" onClick={() => commit(draft)} disabled={draft.length < 3 || !code.trim()}>
                      <Check aria-hidden className="size-4" />
                      Finish ({draft.length} corners)
                    </Button>
                  )}
                  <Button type="button" variant="ghost" disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
                    <Undo2 aria-hidden className="size-4" />
                    Undo
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelMarking}>
                    <X aria-hidden className="size-4" />
                    Cancel
                  </Button>
                </div>
                <p className="text-caption text-accent">
                  {drawMode === "box" ? "Click one corner, then the opposite corner — it is added at once." : "Click the corners one after another around the edge, then press Finish."} Click a corner to remove it · Ctrl+Z undoes the last · Esc cancels.
                </p>
              </div>
            )}
            {note && (
              <p role="status" className="text-body-sm text-success flex items-start gap-2">
                <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
                {note}
              </p>
            )}
          </div>

          <PlanCanvas plan={plan} marking={marking} draft={draft} boxMode={marking && drawMode === "box"} onAddPoint={addPoint} onRemovePoint={(i) => setDraft((d) => d.filter((_, k) => k !== i))} />

          {plan.areas.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {plan.areas.map((a) => (
                <li key={`${a.kind ?? "flat"}-${a.key}`} className="border-border bg-bg flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm">
                  <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: colorOf(a.key) }} />
                  {a.kind === "parking" ? `Parking ${a.key}` : `Flat ${a.key}`}
                  <button type="button" aria-label={`Remove the marked area ${a.key}`} onClick={() => update({ areas: plan.areas.filter((x) => !(x.key === a.key && (x.kind ?? "flat") === (a.kind ?? "flat"))) })} className="text-fg-muted hover:bg-surface flex size-6 items-center justify-center rounded-full">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-fg-subtle">Nothing marked yet — owners will see the whole drawing without a highlighted flat or parking bay.</p>
          )}

          {plan.rooms.length > 0 && (
            <div>
              <p className="text-caption text-fg-muted mb-2">
                {plan.rooms.length} room{plan.rooms.length === 1 ? "" : "s"} marked — the client app turns the rooms inside each owner&rsquo;s flat into room buttons.
              </p>
              <ul className="flex flex-wrap gap-2">
                {plan.rooms.map((r) => (
                  <li key={r.id} className="border-border bg-bg flex items-center gap-2 rounded-full border py-1 pr-1 pl-3 text-sm">
                    <span aria-hidden className="size-2.5 rounded-full bg-teal-600" />
                    {r.label} <span className="text-fg-subtle text-xs">· {r.type}</span>
                    <button type="button" aria-label={`Remove room ${r.label}`} onClick={() => update({ rooms: plan.rooms.filter((x) => x.id !== r.id) })} className="text-fg-muted hover:bg-surface flex size-6 items-center justify-center rounded-full">
                      <X aria-hidden className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <ClientPlanPreview plan={plan} onViewChange={(view) => update({ view })} onAreasChange={(areas) => update({ areas })} />
        </div>
        </div>
      )}
    </fieldset>
  );
}

/**
 * The building's whole-floor plans. Upload the architect's full floor once, say which floors use it, and mark where each flat
 * (A, B, C…) sits on it. Owners then see this plan with their own flat lit and the others dimmed. A building usually needs one
 * "typical" plan (Floors left empty = every other floor) plus an optional plan for the floors that differ (ground floor, penthouse).
 */
export function FloorPlansEditor({ projectId, initial, floors = [] }: { projectId: string; initial: BuildingFloorPlan[]; floors?: { number: number; label: string; flats: number }[] }) {
  const [plans, setPlans] = useState<EditorPlan[]>(initial.map((p) => ({ key: p.id, id: p.id, name: p.name, image: p.image, aspect: p.aspect, floorsText: floorsToText(p.floors), areas: p.areas, rooms: p.rooms ?? [], view: p.view ?? { ...NEUTRAL_VIEW }, homeView: p.homeView })));
  const [saving, startSave] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (key: string, p: Partial<EditorPlan>) => setPlans((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));

  // Which plan each floor uses right now: a plan that lists the floor, else the "typical" plan (the one with Floors left empty).
  const typical = plans.find((p) => p.image && p.floorsText.trim() === "");
  const planOfFloor = (n: number) => plans.find((p) => p.image && (parseFloors(p.floorsText) ?? []).includes(n)) ?? typical;

  /** Move one floor onto a plan (or onto the typical one) — floors listed on other plans are taken off them first. */
  function assignFloor(n: number, planKey: string) {
    setPlans((all) =>
      all.map((p) => {
        const list = parseFloors(p.floorsText) ?? [];
        const without = list.filter((x) => x !== n);
        if (p.key === planKey && p.floorsText.trim() !== "") return { ...p, floorsText: floorsToText([...without, n].sort((a, b) => a - b)) };
        return list.includes(n) ? { ...p, floorsText: floorsToText(without) === "" && p.floorsText.trim() !== "" ? p.floorsText : floorsToText(without) } : p;
      }),
    );
  }

  function save() {
    setMessage(null);
    const payload: Pick<BuildingFloorPlan, "id" | "name" | "image" | "aspect" | "floors" | "areas" | "rooms" | "view" | "homeView">[] = [];
    for (const p of plans) {
      const floors = parseFloors(p.floorsText);
      if (floors === null) return setMessage({ ok: false, text: `Floors for "${p.name || "a plan"}" aren't understood — use numbers like 0, 1-4 or 1,2,5.` });
      payload.push({ id: p.id, name: p.name, image: p.image, aspect: p.aspect, floors, areas: p.areas, rooms: p.rooms, view: p.view, homeView: p.homeView });
    }
    startSave(async () => {
      const res = await saveFloorPlansAction(projectId, JSON.stringify(payload));
      setMessage(res.error ? { ok: false, text: res.error } : { ok: true, text: "Saved. Owners now see their flat highlighted on these plans." });
    });
  }

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      {floors.length > 0 && plans.some((p) => p.image) && (
        <section className="border-border bg-surface-raised rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">Which floor uses which plan</h3>
          <p className="text-caption text-fg-subtle mt-1">Pick a plan for each floor. A floor whose flats are designed differently (ground floor, penthouse) gets its own plan — add it below, then choose it here.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {floors.map((f) => {
              const current = planOfFloor(f.number);
              return (
                <li key={f.number} className="bg-surface flex items-center justify-between gap-3 rounded-lg px-3 py-2">
                  <span className="min-w-0">
                    <span className="text-body-sm block font-semibold">{f.label}</span>
                    <span className="text-caption text-fg-subtle">{f.flats} flat{f.flats === 1 ? "" : "s"}</span>
                  </span>
                  <select
                    value={current?.key ?? ""}
                    onChange={(e) => e.target.value && assignFloor(f.number, e.target.value)}
                    aria-label={`Plan for ${f.label}`}
                    className={cn("text-body-sm h-9 max-w-[11rem] rounded-md border px-2", current ? "border-border-strong bg-surface-raised" : "border-warning bg-warning-soft")}
                  >
                    {!current && <option value="">No plan yet</option>}
                    {plans.filter((p) => p.image).map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.name || "Untitled plan"}{p.floorsText.trim() === "" ? " (typical)" : ""}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {plans.length === 0 && <p className="text-body-sm text-fg-subtle">No floor plans yet.</p>}
      {plans.map((plan) => (
        <PlanCard key={plan.key} plan={plan} projectId={projectId} update={(p) => patch(plan.key, p)} remove={() => setPlans((all) => all.filter((x) => x.key !== plan.key))} />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => setPlans((all) => [...all, { key: newKey(), id: "", name: all.length === 0 ? "Typical floor" : "", image: "", aspect: 1, floorsText: "", areas: [], rooms: [], view: { ...NEUTRAL_VIEW } }])}>
          <Plus aria-hidden className="size-4" />
          Add a floor plan
        </Button>
        <Button type="button" loading={saving} onClick={save}>
          Save floor plans
        </Button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={cn("text-body-sm", message.ok ? "text-success" : "text-error")}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
