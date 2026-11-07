import { extractAreasFromSvg, extractRoomsFromSvg, sanitizeFlatOutline, sanitizePlanRooms, type FlatOutline, type PlanRooms } from "@/lib/planRooms";
import { pickFlatMarker } from "@/lib/unitPlan";
import { normalizeBlueprintSvg } from "@/lib/svgNormalize";

/**
 * Fits an uploaded SVG blueprint to the app (turn it upright, trim empty margins) BEFORE anything else reads it — so the rooms, flats and
 * parking bays read from its markers, and the file that gets saved, are in the same coordinates. A picture (JPG/PNG) comes back as it is.
 * Returns the file to use plus plain-language notes on what was fixed.
 */
export async function prepareBlueprintFile(file: File): Promise<{ file: File; notes: string[] }> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (!isSvg) return { file, notes: [] };
  const fixed = normalizeBlueprintSvg(await file.text());
  if (fixed.notes.length === 0) return { file, notes: [] };
  return { file: new File([fixed.svg], file.name, { type: "image/svg+xml" }), notes: fixed.notes };
}

/**
 * Works out the rooms to save for one uploaded plan.
 *
 * The admin editor posts the rooms it is showing as JSON in a hidden field (`fieldName`). That wins when present. When the field is
 * missing or empty and a NEW SVG was uploaded, the rooms are read from the SVG's own `data-room` markers — so a plan made with the
 * Blueprint AI prompt connects to the room buttons with nothing drawn by hand, even if the editor never ran. With no new file and no
 * field, whatever was saved before is kept.
 */
export async function roomsFromForm(formData: FormData, fieldName: string, newFile: File | null, previous?: PlanRooms): Promise<PlanRooms | undefined> {
  const raw = formData.get(fieldName);
  if (typeof raw === "string" && raw.trim() && raw.trim() !== "null") {
    try {
      const parsed = sanitizePlanRooms(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      // fall through to auto-detect
    }
  }
  if (newFile) {
    const isSvg = newFile.type === "image/svg+xml" || /\.svg$/i.test(newFile.name);
    if (isSvg) return extractRoomsFromSvg(await newFile.text()) ?? undefined;
    return undefined;
  }
  // No new drawing: an explicit empty field means "no rooms" (the admin deleted them all); an absent field keeps what was saved.
  return typeof raw === "string" ? undefined : previous;
}

/**
 * The outline of THIS flat on a whole-floor drawing (a public unit page then shows just that flat). Same priority as the rooms: the
 * editor's hidden field wins; otherwise a freshly uploaded SVG's own `data-flat` markers are searched for the flat matching `unitNumber`;
 * with no new file and no field, the saved outline is kept.
 */
export async function flatOutlineFromForm(
  formData: FormData,
  fieldName: string,
  newFile: File | null,
  unitNumber: string,
  floor: number | undefined,
  previous?: FlatOutline,
): Promise<FlatOutline | undefined> {
  const raw = formData.get(fieldName);
  if (typeof raw === "string" && raw.trim() && raw.trim() !== "null") {
    try {
      const parsed = sanitizeFlatOutline(JSON.parse(raw));
      if (parsed) return parsed;
    } catch {
      // fall through
    }
  }
  if (newFile) {
    const isSvg = newFile.type === "image/svg+xml" || /\.svg$/i.test(newFile.name);
    if (!isSvg) return undefined;
    const found = extractAreasFromSvg(await newFile.text());
    const mine = found ? pickFlatMarker(found.areas, unitNumber, floor) : undefined;
    return found && mine ? { aspect: found.aspect, points: mine.points } : undefined;
  }
  return typeof raw === "string" ? undefined : previous;
}
