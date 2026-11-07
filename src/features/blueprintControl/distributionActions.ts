"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { parkingRepository } from "@/features/parking/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { prepareBlueprintFile } from "@/features/planRooms/fromForm";
import { assignParkingToOwner, releaseParkingFromOwner } from "@/features/parking/actions";

export interface DistributionState {
  error?: string;
  saved?: boolean;
}

/**
 * Blueprint AI → Distribution → one client's flat: which whole-floor plan they get ("" = chosen automatically by the flat's floor), and
 * whether the plan reaches their app at all. The client app and the owner portal read both at view time (`resolveUnitPlan`).
 */
export async function saveClientDistribution(unitId: string, _prev: DistributionState, formData: FormData): Promise<DistributionState> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "customer.update")) throw new Error("Forbidden");

  const unit = await unitRepository.findById(unitId);
  if (!unit) return { error: "That flat no longer exists." };

  const planId = String(formData.get("planId") ?? "").trim();
  if (planId) {
    const project = await projectRepository.findById(unit.projectId);
    if (!project?.floorPlans?.some((p) => p.id === planId)) return { error: "That plan no longer exists on this project." };
  }
  const show = formData.get("show") === "on";

  await unitRepository.update(unitId, {
    planFloorPlanId: planId || undefined,
    hidePlanFromOwner: show ? undefined : true,
  });
  await recordAuditEvent({
    actorUserId: user.id,
    action: "unit.planDistribution",
    entityType: "Unit",
    entityId: unitId,
    previousValue: { planId: unit.planFloorPlanId ?? "", hidePlan: !!unit.hidePlanFromOwner },
    newValue: { planId, hidePlan: !show },
  });
  revalidatePath("/admin/settings/blueprint-ai/distribution");
  revalidatePath("/admin/clients");
  revalidatePath("/portal", "layout");
  return { saved: true };
}

/**
 * Blueprint AI → Distribution → Parking: gives one parking bay to a client ("" = nobody). A bay that already belongs to someone else
 * is released first, so the ownership history stays right. The client app lights the bay on the parking plan automatically.
 */
export async function saveParkingClient(parkingId: string, _prev: DistributionState, formData: FormData): Promise<DistributionState> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "parking.manage")) throw new Error("Forbidden");

  const customerId = String(formData.get("customerId") ?? "").trim();
  const bay = await parkingRepository.findById(parkingId);
  if (!bay) return { error: "That parking bay no longer exists." };

  const currentlyOwned = bay.ownerType === "customer" ? bay.ownerId : bay.ownerId ? "other" : "";
  if (customerId && currentlyOwned === customerId) return { saved: true };

  if (bay.ownerId) await releaseParkingFromOwner(parkingId);
  if (customerId) {
    const res = await assignParkingToOwner(parkingId, "customer", customerId);
    if (res.error) return { error: res.error };
  }
  revalidatePath("/admin/settings/blueprint-ai/distribution");
  revalidatePath("/portal", "layout");
  return { saved: true };
}

/**
 * Blueprint AI → Distribution → one client: give their flat its OWN plan (an SVG or picture), or take it away again. A flat's own plan
 * wins over the project's whole-floor plans, so this is for the one client who needs something different. Same file checks as every
 * other blueprint upload (turned upright, trimmed, refused if it would glitch on phones).
 */
export async function saveClientCustomPlan(unitId: string, _prev: DistributionState, formData: FormData): Promise<DistributionState> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "customer.update")) throw new Error("Forbidden");

  const unit = await unitRepository.findById(unitId);
  if (!unit) return { error: "That flat no longer exists." };

  if (formData.get("remove") === "on") {
    if (unit.layoutImage) await deleteUploadedFile(unit.layoutImage);
    await unitRepository.update(unitId, { layoutImage: undefined });
  } else {
    const picked = formData.get("plan");
    if (!(picked instanceof File) || picked.size === 0) return { error: "Choose an SVG or picture first." };
    try {
      const { file } = await prepareBlueprintFile(picked);
      const saved = await saveUploadedFile(file, "projects", { blueprint: true });
      if (unit.layoutImage) await deleteUploadedFile(unit.layoutImage);
      await unitRepository.update(unitId, { layoutImage: saved.url });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that plan." };
    }
  }

  await recordAuditEvent({ actorUserId: user.id, action: "unit.customPlan", entityType: "Unit", entityId: unitId });
  revalidatePath("/admin/settings/blueprint-ai/distribution");
  revalidatePath("/admin/clients");
  revalidatePath("/portal", "layout");
  return { saved: true };
}
