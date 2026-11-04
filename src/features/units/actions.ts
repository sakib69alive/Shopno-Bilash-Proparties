"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import type { UnitFacing, UnitStatus } from "@/types/unit";

export interface UnitFormState {
  error?: string;
}

const UNIT_STATUSES: UnitStatus[] = ["available", "reserved", "booked", "sold", "allocated", "on-hold", "cancelled"];
const UNIT_FACINGS: UnitFacing[] = [
  "north",
  "south",
  "east",
  "west",
  "north-east",
  "north-west",
  "south-east",
  "south-west",
];

function isUnitStatus(value: string): value is UnitStatus {
  return (UNIT_STATUSES as string[]).includes(value);
}

function isUnitFacing(value: string): value is UnitFacing {
  return (UNIT_FACINGS as string[]).includes(value);
}

function toOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function getUploadedFile(formData: FormData, field: string): File | null {
  const file = formData.get(field);
  return file instanceof File && file.size > 0 ? file : null;
}

function getUploadedFiles(formData: FormData, field: string): File[] {
  return formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

async function requireUnitPermission() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "unit.manage")) throw new Error("Forbidden");
  return user;
}

async function parseUnitFields(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const buildingId = String(formData.get("buildingId") ?? "").trim();
  const floorId = String(formData.get("floorId") ?? "").trim();
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  const sizeSqftRaw = String(formData.get("sizeSqft") ?? "");
  const allocationRatioRaw = String(formData.get("allocationRatio") ?? "");
  const bedroomsRaw = String(formData.get("bedrooms") ?? "");
  const bathroomsRaw = String(formData.get("bathrooms") ?? "");
  const balconiesRaw = String(formData.get("balconies") ?? "");
  const parkingSpacesRaw = String(formData.get("parkingSpaces") ?? "");
  const facing = String(formData.get("facing") ?? "");
  const basePriceRaw = String(formData.get("basePrice") ?? "");
  const additionalChargesRaw = String(formData.get("additionalCharges") ?? "");
  const discountRaw = String(formData.get("discount") ?? "");
  const status = String(formData.get("status") ?? "");
  const unitTypeIdRaw = String(formData.get("unitTypeId") ?? "").trim();

  if (!projectId) return { error: "Choose a project." } as const;
  const project = await projectRepository.findById(projectId);
  if (!project) return { error: "That project no longer exists." } as const;
  if (!buildingId) return { error: "Choose a building." } as const;
  const building = await buildingRepository.findById(buildingId);
  if (!building) return { error: "That building no longer exists." } as const;
  if (!floorId) return { error: "Choose a floor." } as const;
  const floor = await floorRepository.findById(floorId);
  if (!floor) return { error: "That floor no longer exists." } as const;
  if (!unitNumber) return { error: "Enter a unit number." } as const;
  if (!isUnitStatus(status)) return { error: "Choose a valid status." } as const;
  if (facing && !isUnitFacing(facing)) return { error: "Choose a valid facing." } as const;

  // Blank = match the blueprint type automatically from the flat number; otherwise it must be one of this project's types.
  if (unitTypeIdRaw && !(project.unitTypes ?? []).some((t) => t.id === unitTypeIdRaw)) {
    return { error: "That blueprint type doesn't belong to this project." } as const;
  }

  const sizeSqft = toOptionalNumber(sizeSqftRaw) ?? 0;
  const basePrice = toOptionalNumber(basePriceRaw) ?? 0;
  const additionalCharges = toOptionalNumber(additionalChargesRaw) ?? 0;
  const discount = toOptionalNumber(discountRaw) ?? 0;

  return {
    fields: {
      projectId,
      buildingId,
      floorId,
      unitNumber,
      sizeSqft,
      allocationRatio: toOptionalNumber(allocationRatioRaw),
      bedrooms: toOptionalNumber(bedroomsRaw) ?? 0,
      bathrooms: toOptionalNumber(bathroomsRaw) ?? 0,
      balconies: toOptionalNumber(balconiesRaw) ?? 0,
      parkingSpaces: toOptionalNumber(parkingSpacesRaw) ?? 0,
      facing: facing ? (facing as UnitFacing) : undefined,
      unitTypeId: unitTypeIdRaw || undefined,
      basePrice,
      additionalCharges,
      discount,
      finalPrice: basePrice + additionalCharges - discount,
      status,
    },
  } as const;
}

export async function createUnit(_prevState: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const user = await requireUnitPermission();

  const parsed = await parseUnitFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const layoutFile = getUploadedFile(formData, "layoutImage");
  const galleryFiles = getUploadedFiles(formData, "gallery");

  let layoutImage: string | undefined;
  let galleryImages: string[] = [];
  try {
    if (layoutFile) layoutImage = (await saveUploadedFile(layoutFile, "units")).url;
    if (galleryFiles.length > 0) {
      galleryImages = (await Promise.all(galleryFiles.map((f) => saveUploadedFile(f, "units")))).map((f) => f.url);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the uploaded image(s)." };
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  await unitRepository.create({
    id,
    projectId: fields.projectId,
    buildingId: fields.buildingId,
    floorId: fields.floorId,
    unitNumber: fields.unitNumber,
    sizeSqft: fields.sizeSqft,
    allocationRatio: fields.allocationRatio,
    bedrooms: fields.bedrooms,
    bathrooms: fields.bathrooms,
    balconies: fields.balconies,
    parkingSpaces: fields.parkingSpaces,
    facing: fields.facing,
    layoutImage,
    unitTypeId: fields.unitTypeId,
    galleryImages,
    basePrice: { amount: fields.basePrice, currency: "BDT" },
    additionalCharges: { amount: fields.additionalCharges, currency: "BDT" },
    discount: { amount: fields.discount, currency: "BDT" },
    finalPrice: { amount: fields.finalPrice, currency: "BDT" },
    status: fields.status,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "unit.create", entityType: "Unit", entityId: id });

  revalidatePath("/admin/properties");
  redirect("/admin/properties");
}

export async function updateUnit(id: string, _prevState: UnitFormState, formData: FormData): Promise<UnitFormState> {
  const user = await requireUnitPermission();

  const parsed = await parseUnitFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await unitRepository.findById(id);
  if (!existing) return { error: "This property no longer exists." };

  const layoutFile = getUploadedFile(formData, "layoutImage");
  const galleryFiles = getUploadedFiles(formData, "gallery");

  let layoutImage = existing.layoutImage;
  let galleryImages = existing.galleryImages ?? [];
  try {
    if (layoutFile) {
      const saved = await saveUploadedFile(layoutFile, "units");
      if (existing.layoutImage) await deleteUploadedFile(existing.layoutImage);
      layoutImage = saved.url;
    } else if (formData.get("removeLayoutImage") === "on" && existing.layoutImage) {
      // Drop the flat's own custom plan so it falls back to its blueprint type.
      await deleteUploadedFile(existing.layoutImage);
      layoutImage = undefined;
    }
    if (galleryFiles.length > 0) {
      const saved = await Promise.all(galleryFiles.map((f) => saveUploadedFile(f, "units")));
      galleryImages = [...galleryImages, ...saved.map((f) => f.url)];
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the uploaded image(s)." };
  }

  const updated = await unitRepository.update(id, {
    projectId: fields.projectId,
    buildingId: fields.buildingId,
    floorId: fields.floorId,
    unitNumber: fields.unitNumber,
    sizeSqft: fields.sizeSqft,
    allocationRatio: fields.allocationRatio,
    bedrooms: fields.bedrooms,
    bathrooms: fields.bathrooms,
    balconies: fields.balconies,
    parkingSpaces: fields.parkingSpaces,
    facing: fields.facing,
    layoutImage,
    unitTypeId: fields.unitTypeId,
    galleryImages,
    basePrice: { amount: fields.basePrice, currency: "BDT" },
    additionalCharges: { amount: fields.additionalCharges, currency: "BDT" },
    discount: { amount: fields.discount, currency: "BDT" },
    finalPrice: { amount: fields.finalPrice, currency: "BDT" },
    status: fields.status,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "This property no longer exists." };

  await recordAuditEvent({ actorUserId: user.id, action: "unit.update", entityType: "Unit", entityId: id });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  redirect(`/admin/properties/${id}`);
}

export async function deleteUnit(id: string): Promise<void> {
  const user = await requireUnitPermission();

  const existing = await unitRepository.findById(id);
  if (!existing) return;

  await unitRepository.remove(id);

  await recordAuditEvent({ actorUserId: user.id, action: "unit.delete", entityType: "Unit", entityId: id });

  revalidatePath("/admin/properties");
}
