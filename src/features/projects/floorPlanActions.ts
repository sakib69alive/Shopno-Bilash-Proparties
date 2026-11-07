"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessProject } from "@/lib/projectScope";
import { recordAuditEvent } from "@/features/audit/repository";
import { projectRepository } from "@/features/projects/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { extractAreasFromSvg, extractRoomsFromSvg, sanitizePlanRooms, sanitizePlanView, type PlanRoom } from "@/lib/planRooms";
import { rotateBlueprintSvg } from "@/lib/svgNormalize";
import { readFromAnyStore } from "@/lib/uploadStore";
import { prepareBlueprintFile } from "@/features/planRooms/fromForm";
import type { BuildingFloorPlan, FlatArea } from "@/types/project";

export interface FloorPlanUploadResult {
  url?: string;
  aspect?: number;
  /** Flats and parking bays read from `data-flat` / `data-parking` markers in an SVG — filled in without any drawing by hand. */
  areas?: FlatArea[];
  /** Rooms read from `data-room` markers. */
  rooms?: PlanRoom[];
  /** What the upload fixed on its own ("Turned upright…", "Trimmed the empty margins…"). */
  notes?: string[];
  error?: string;
}

export interface FloorPlansSaveResult {
  error?: string;
  saved?: boolean;
}

async function requireProjectUpdate(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "project.update")) throw new Error("You don't have permission to change this project.");
  if (!canAccessProject(user, projectId)) throw new Error("This project isn't assigned to your account.");
  return user;
}

/** width ÷ height of the drawing: from the viewBox of an SVG, or the pixel size of a picture. */
async function drawingAspect(file: File): Promise<number | null> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) {
    const text = bytes.toString("utf8");
    const vb = text.match(/<svg\b[^>]*\bviewBox\s*=\s*["']\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*["']/i);
    if (vb) {
      const w = parseFloat(vb[3]);
      const h = parseFloat(vb[4]);
      if (w > 0 && h > 0) return w / h;
    }
    return null;
  }
  const meta = await sharp(bytes).metadata();
  return meta.width && meta.height ? meta.width / meta.height : null;
}

/**
 * Uploads ONE whole-floor drawing and tells the editor its proportions, so the flat areas drawn on it later line up exactly.
 * SVGs go through the same blueprint checker as every other plan (a plan that would glitch on phones is refused with the reason).
 */
export async function uploadFloorPlanImageAction(projectId: string, formData: FormData): Promise<FloorPlanUploadResult> {
  try {
    await requireProjectUpdate(projectId);
    const picked = formData.get("image");
    if (!(picked instanceof File) || picked.size === 0) return { error: "Choose a drawing to upload." };
    // Fit the drawing to the app first (turn it upright if its lettering is sideways, trim empty margins): the proportions, the saved
    // file and the flat/parking/room markers all then agree.
    const { file, notes } = await prepareBlueprintFile(picked);
    const aspect = await drawingAspect(file);
    if (!aspect) return { error: "Couldn't read the drawing's size. An SVG needs a viewBox; or upload a JPG/PNG." };
    const saved = await saveUploadedFile(file, "projects", { blueprint: true });
    const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
    const text = isSvg ? await file.text() : "";
    const found = text ? extractAreasFromSvg(text) : null;
    const rooms = text ? extractRoomsFromSvg(text) : null;
    return {
      url: saved.url,
      aspect,
      areas: found ? found.areas.map((a) => ({ kind: a.kind, key: a.key, points: a.points })) : [],
      rooms: rooms?.rooms ?? [],
      notes,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't upload the drawing." };
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Parses and cleans what the editor sends. Anything malformed is dropped rather than trusted. */
function parsePlans(json: string): BuildingFloorPlan[] | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: "The floor plans couldn't be read. Please reload the page and try again." };
  }
  if (!Array.isArray(raw)) return { error: "The floor plans couldn't be read." };

  const plans: BuildingFloorPlan[] = [];
  const claimedFloors = new Map<number, string>();
  let defaults = 0;
  for (const item of raw as Record<string, unknown>[]) {
    const name = String(item.name ?? "").trim();
    const image = String(item.image ?? "");
    const aspect = Number(item.aspect);
    if (!image) continue; // a row with no drawing yet isn't saved
    if (!name) return { error: "Give every floor plan a name." };
    if (!image.startsWith("/api/uploads/") && !image.startsWith("/uploads/")) return { error: "A floor plan has an invalid drawing." };
    if (!(aspect > 0 && aspect < 50)) return { error: `"${name}" has an unreadable drawing size — upload the drawing again.` };

    const floors = [...new Set((Array.isArray(item.floors) ? item.floors : []).map(Number).filter((n) => Number.isInteger(n) && n >= -5 && n <= 200))].sort((a, b) => a - b);
    if (floors.length === 0) defaults++;
    for (const f of floors) {
      const clash = claimedFloors.get(f);
      if (clash) return { error: `Floor ${f} is claimed by both "${clash}" and "${name}" — each floor can use one plan.` };
      claimedFloors.set(f, name);
    }

    const areas: FlatArea[] = [];
    for (const a of (Array.isArray(item.areas) ? item.areas : []) as Record<string, unknown>[]) {
      const key = String(a.key ?? "").trim().toUpperCase();
      const points = (Array.isArray(a.points) ? a.points : [])
        .map((p) => (Array.isArray(p) ? ([clamp01(Number(p[0])), clamp01(Number(p[1]))] as [number, number]) : null))
        .filter((p): p is [number, number] => p !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map((p) => [Math.round(p[0] * 10000) / 10000, Math.round(p[1] * 10000) / 10000] as [number, number]);
      if (points.length < 3) continue;
      if (!key) return { error: `Give every marked area on "${name}" a flat code (like A) or parking number (like P-01).` };
      const turn = Number(a.turn);
      areas.push({ kind: a.kind === "parking" ? "parking" : "flat", key, points, ...(Number.isFinite(turn) && turn !== 0 ? { turn: Math.round(Math.min(180, Math.max(-180, turn)) * 10) / 10 } : {}) });
    }
    // Rooms (for the room buttons in the client app): same cleaning as everywhere else.
    const rooms = sanitizePlanRooms({ aspect, rooms: item.rooms })?.rooms;
    const view = sanitizePlanView(item.view);
    const homeView = sanitizePlanView(item.homeView);
    plans.push({ id: String(item.id || "") || randomUUID(), name, image, aspect, floors, areas, ...(rooms ? { rooms } : {}), ...(view ? { view } : {}), ...(homeView ? { homeView } : {}) });
  }
  if (defaults > 1) return { error: 'Only one plan can be the "every other floor" plan — give the others their own floor numbers.' };
  return plans;
}

/** Saves the building's whole-floor plans, removes drawings that no plan uses any more, and refreshes every page that shows them. */
export async function saveFloorPlansAction(projectId: string, plansJson: string): Promise<FloorPlansSaveResult> {
  try {
    const user = await requireProjectUpdate(projectId);
    const project = await projectRepository.findById(projectId);
    if (!project) return { error: "This project no longer exists." };

    const parsed = parsePlans(plansJson);
    if ("error" in parsed) return { error: parsed.error };

    const previous = project.floorPlans ?? [];
    // Only ever delete a drawing this project already owned — never a path that merely arrived in the form.
    for (const old of previous) {
      if (old.image && !parsed.some((p) => p.image === old.image) && !(project.unitTypes ?? []).some((t) => t.image === old.image)) await deleteUploadedFile(old.image);
    }
    for (const plan of parsed) {
      const known = previous.some((p) => p.image === plan.image);
      if (!known && !plan.image.includes("/projects/") && !plan.image.startsWith("/uploads/demo/")) return { error: "A floor plan uses a drawing that was not uploaded here." };
    }

    await projectRepository.update(projectId, { floorPlans: parsed, updatedBy: user.id, updatedAt: new Date().toISOString() });
    await recordAuditEvent({ actorUserId: user.id, action: "project.update", entityType: "Project", entityId: projectId });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/admin/projects/${projectId}/floor-plans`);
    revalidatePath("/portal", "layout");
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the floor plans." };
  }
}

/**
 * Blueprint AI → Distribution: saves ONLY how one whole-floor plan is placed on the client app (tilt / zoom / shift, and each flat's own
 * Home-card turn). Nothing else of the plan is touched, so it is safe next to the full Floor plans editor.
 */
export async function savePlanPlacementAction(
  projectId: string,
  planId: string,
  viewRaw: unknown,
  turns: { kind?: string; key: string; turn?: number }[],
  homeViewRaw?: unknown,
): Promise<FloorPlansSaveResult> {
  try {
    const user = await requireProjectUpdate(projectId);
    const project = await projectRepository.findById(projectId);
    const plan = project?.floorPlans?.find((p) => p.id === planId);
    if (!project || !plan) return { error: "That floor plan no longer exists." };

    const view = sanitizePlanView(viewRaw);
    const areas = plan.areas.map((a) => {
      const t = turns.find((x) => x.key === a.key && (x.kind === "parking" ? "parking" : "flat") === (a.kind === "parking" ? "parking" : "flat"));
      const turn = Number(t?.turn);
      const { turn: _old, ...rest } = a;
      void _old;
      return Number.isFinite(turn) && turn !== 0 ? { ...rest, turn: Math.round(Math.min(180, Math.max(-180, turn)) * 10) / 10 } : rest;
    });
    const homeView = sanitizePlanView(homeViewRaw);
    const { view: _oldView, homeView: _oldHome, ...planRest } = plan;
    void _oldView;
    void _oldHome;
    const nextPlans = (project.floorPlans ?? []).map((p) => (p.id === planId ? { ...planRest, areas, ...(view ? { view } : {}), ...(homeView ? { homeView } : {}) } : p));

    await projectRepository.update(projectId, { floorPlans: nextPlans, updatedBy: user.id, updatedAt: new Date().toISOString() });
    await recordAuditEvent({ actorUserId: user.id, action: "project.update", entityType: "Project", entityId: projectId });
    revalidatePath(`/admin/projects/${projectId}/floor-plans`);
    revalidatePath("/admin/settings/blueprint-ai/distribution");
    revalidatePath("/portal", "layout");
    return { saved: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the placement." };
  }
}

export interface FloorPlanRotateResult {
  url?: string;
  aspect?: number;
  error?: string;
}

/**
 * Turns an uploaded floor drawing a quarter turn (or half) — for the rare drawing the automatic fix could not judge. A NEW file is
 * saved (the old one stays until the plans are saved, so nothing breaks if the admin leaves without saving); the editor turns the
 * areas it already holds by the same amount, so they stay on the right flats.
 */
export async function rotateFloorPlanImageAction(projectId: string, imageUrl: string, deg: number): Promise<FloorPlanRotateResult> {
  try {
    await requireProjectUpdate(projectId);
    if (deg !== 90 && deg !== -90 && deg !== 180) return { error: "Unsupported turn." };
    const rel = imageUrl.startsWith("/api/uploads/") ? imageUrl.slice("/api/uploads/".length) : imageUrl.startsWith("/uploads/") ? imageUrl.slice("/uploads/".length) : null;
    if (!rel || !/\.svg$/i.test(imageUrl)) return { error: "Only an uploaded SVG drawing can be turned here. A JPG or PNG cannot be turned — upload it the right way up." };
    const buffer = await readFromAnyStore(rel);
    if (!buffer) return { error: "That drawing could not be found." };
    const turned = rotateBlueprintSvg(buffer.toString("utf8"), deg);
    const name = imageUrl.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "") || "floor-plan.svg";
    const file = new File([turned], name, { type: "image/svg+xml" });
    const aspect = await drawingAspect(file);
    if (!aspect) return { error: "Couldn't read the turned drawing." };
    const saved = await saveUploadedFile(file, "projects", { blueprint: true });
    return { url: saved.url, aspect };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't turn the drawing." };
  }
}
