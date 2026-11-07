"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { projectContentRepository } from "@/features/projectContent/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { roomsFromForm, prepareBlueprintFile } from "@/features/planRooms/fromForm";
import { BLUEPRINT_KIND_LABEL, BLUEPRINT_KIND_ORDER, type BlueprintKind, type ProjectBlueprint } from "@/content/projects";

export interface BlueprintControlState {
  error?: string;
  saved?: boolean;
}

async function requireUpdate() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "content.update")) throw new Error("Forbidden");
  return user;
}

function refresh(slug: string) {
  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  revalidatePath("/admin/settings/blueprint-ai/control");
  revalidatePath("/", "layout");
}

/**
 * Control panel → one slot (garage / floor / roof) of one project: replace or remove the SVG, edit its room buttons, rename its
 * tab, and show/hide it on the public page — all saved in place, no redirect. Same file handling as the project edit form
 * (turned upright + trimmed first, rooms read from `data-room` markers when the editor did not post any).
 */
export async function saveBlueprintSlot(
  projectId: string,
  kind: BlueprintKind,
  _prev: BlueprintControlState,
  formData: FormData,
): Promise<BlueprintControlState> {
  const user = await requireUpdate();
  if (!BLUEPRINT_KIND_ORDER.includes(kind)) return { error: "Unknown blueprint slot." };

  const project = await projectContentRepository.findById(projectId);
  if (!project) return { error: "This project no longer exists." };

  const current = project.blueprints?.find((b) => b.kind === kind);
  const picked = formData.get("blueprint");
  const pickedFile = picked instanceof File && picked.size > 0 ? picked : null;
  const customLabel = String(formData.get("label") ?? "").trim();
  // The panel's switch reads "Show this plan": ON = visible.
  const hidden = formData.get("show") !== "on";

  let next: ProjectBlueprint | null = null;

  if (pickedFile) {
    const file = (await prepareBlueprintFile(pickedFile)).file;
    let saved;
    try {
      saved = await saveUploadedFile(file, "blueprints");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that blueprint." };
    }
    if (current) await deleteUploadedFile(current.image.src);
    const planRooms = await roomsFromForm(formData, "blueprintRooms", file);
    next = {
      kind,
      label: customLabel || BLUEPRINT_KIND_LABEL[kind],
      image: { src: saved.url, alt: `${BLUEPRINT_KIND_LABEL[kind]} blueprint of ${project.name}` },
      ...(planRooms ? { planRooms } : {}),
      ...(hidden ? { hidden: true } : {}),
    };
  } else if (current && formData.get("removeBlueprint") === "on") {
    await deleteUploadedFile(current.image.src);
  } else if (current) {
    const planRooms = await roomsFromForm(formData, "blueprintRooms", null, current.planRooms);
    const { planRooms: _old, hidden: _hidden, ...rest } = current;
    void _old;
    void _hidden;
    next = { ...rest, label: customLabel || BLUEPRINT_KIND_LABEL[kind], ...(planRooms ? { planRooms } : {}), ...(hidden ? { hidden: true } : {}) };
  } else {
    return { error: "Choose an SVG (or image) to add." };
  }

  const others = (project.blueprints ?? []).filter((b) => b.kind !== kind);
  const merged = [...others, ...(next ? [next] : [])].sort((a, b) => BLUEPRINT_KIND_ORDER.indexOf(a.kind) - BLUEPRINT_KIND_ORDER.indexOf(b.kind));
  await projectContentRepository.update(projectId, { blueprints: merged.length > 0 ? merged : undefined });

  await recordAuditEvent({ actorUserId: user.id, action: "content.project.blueprint", entityType: "Project", entityId: projectId });
  refresh(project.slug);
  return { saved: true };
}

/** Control panel → one project: hide the whole blueprint section on the public page, and/or just the Enlarge (zoom) button. */
export async function saveBlueprintVisibility(
  projectId: string,
  _prev: BlueprintControlState,
  formData: FormData,
): Promise<BlueprintControlState> {
  const user = await requireUpdate();
  const project = await projectContentRepository.findById(projectId);
  if (!project) return { error: "This project no longer exists." };

  await projectContentRepository.update(projectId, {
    // The switches read "Show …": ON = visible, so a missing value means hidden.
    blueprintsHidden: formData.get("showBlueprints") === "on" ? undefined : true,
    blueprintZoomHidden: formData.get("showZoom") === "on" ? undefined : true,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "content.project.blueprint-visibility", entityType: "Project", entityId: projectId });
  refresh(project.slug);
  return { saved: true };
}
