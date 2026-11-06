"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { unitContentRepository, slugifyUnitName } from "@/features/unitContent/repository";
import { projectContentRepository } from "@/features/projectContent/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { checkTourField, checkVideoField } from "@/lib/mediaLinks";
import { PLACEHOLDER_IMAGE, getUploadedFile, resolveCoverAndGallery } from "@/lib/photoUploads";
import type { ImageAsset } from "@/content/shared";
import type { UnitStatus } from "@/content/units";

export interface UnitContentFormState {
  error?: string;
}

const UNIT_STATUSES: UnitStatus[] = ["available", "reserved", "sold", "on-hold"];

function isUnitStatus(value: string): value is UnitStatus {
  return (UNIT_STATUSES as string[]).includes(value);
}

function toOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function toList(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function requireContentPermission(permission: "content.create" | "content.update" | "content.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

/** New floor-plan file replaces (and deletes) the old one; the remove box drops it; otherwise the saved one stays. */
async function resolveFloorPlan(
  formData: FormData,
  existing: ImageAsset | undefined,
  unitName: string,
): Promise<{ floorPlan?: ImageAsset; error?: string }> {
  const file = getUploadedFile(formData, "floorPlan");
  if (file) {
    try {
      const saved = await saveUploadedFile(file, "units");
      if (existing) await deleteUploadedFile(existing.src);
      return { floorPlan: { src: saved.url, alt: `Floor plan of ${unitName}` } };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that floor plan." };
    }
  }
  if (existing && formData.get("removeFloorPlan") === "on") {
    await deleteUploadedFile(existing.src);
    return {};
  }
  return { floorPlan: existing };
}

async function parseUnitFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  const unitNumber = String(formData.get("unitNumber") ?? "").trim();
  const unitType = String(formData.get("unitType") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const area = String(formData.get("area") ?? "").trim();
  const facing = String(formData.get("facing") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const floorRaw = String(formData.get("floor") ?? "");
  const bedroomsRaw = String(formData.get("bedrooms") ?? "");
  const bathroomsRaw = String(formData.get("bathrooms") ?? "");
  const balconiesRaw = String(formData.get("balconies") ?? "");
  const parkingRaw = String(formData.get("parking") ?? "");

  const video = checkVideoField(String(formData.get("videoUrl") ?? ""));
  if (video.error) return { error: video.error } as const;
  const tour = checkTourField(String(formData.get("tour360Url") ?? ""));
  if (tour.error) return { error: tour.error } as const;

  if (!name || name.length < 2) return { error: "Name must be at least 2 characters." } as const;
  const projects = await projectContentRepository.list();
  if (!projectSlug || !projects.some((p) => p.slug === projectSlug)) return { error: "Choose a valid project." } as const;
  if (!unitType) return { error: "Enter a unit type, e.g. \"Apartment\"." } as const;
  if (!isUnitStatus(status)) return { error: "Choose a valid status." } as const;
  if (!shortDescription || shortDescription.length < 10) return { error: "Short description must be at least 10 characters." } as const;
  if (!description || description.length < 10) return { error: "Description must be at least 10 characters." } as const;

  return {
    fields: {
      name,
      projectSlug,
      unitNumber: unitNumber || undefined,
      unitType,
      status,
      area: area || undefined,
      facing: facing || undefined,
      price: price || undefined,
      shortDescription,
      description,
      features: toList(featuresRaw),
      floor: toOptionalNumber(floorRaw),
      bedrooms: toOptionalNumber(bedroomsRaw),
      bathrooms: toOptionalNumber(bathroomsRaw),
      balconies: toOptionalNumber(balconiesRaw),
      parking: toOptionalNumber(parkingRaw),
      videoUrl: video.value,
      tour360Url: tour.value,
    },
  } as const;
}

export async function createUnitContent(
  _prevState: UnitContentFormState,
  formData: FormData,
): Promise<UnitContentFormState> {
  const user = await requireContentPermission("content.create");

  const parsed = await parseUnitFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await unitContentRepository.list();
  let slug = slugifyUnitName(fields.name);
  if (existing.some((u) => u.slug === slug)) {
    slug = `${slug}-${existing.length + 1}`;
  }

  const photos = await resolveCoverAndGallery(formData, undefined, fields.name, "units");
  if (photos.error) return { error: photos.error };
  const plan = await resolveFloorPlan(formData, undefined, fields.name);
  if (plan.error) return { error: plan.error };

  const id = randomUUID();
  await unitContentRepository.create({
    id,
    slug,
    projectSlug: fields.projectSlug,
    name: fields.name,
    unitNumber: fields.unitNumber,
    unitType: fields.unitType,
    status: fields.status,
    floor: fields.floor,
    area: fields.area,
    bedrooms: fields.bedrooms,
    bathrooms: fields.bathrooms,
    balconies: fields.balconies,
    parking: fields.parking,
    videoUrl: fields.videoUrl,
    tour360Url: fields.tour360Url,
    facing: fields.facing,
    price: fields.price,
    shortDescription: fields.shortDescription,
    description: fields.description,
    features: fields.features.length > 0 ? fields.features : undefined,
    coverImage: photos.coverImage ?? { src: PLACEHOLDER_IMAGE, alt: fields.name },
    gallery: photos.gallery?.length ? photos.gallery : [{ src: PLACEHOLDER_IMAGE, alt: fields.name }],
    floorPlan: plan.floorPlan,
  });

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.unit.create",
    entityType: "Unit",
    entityId: id,
  });

  revalidatePath("/properties");
  revalidatePath(`/projects/${fields.projectSlug}`);
  revalidatePath(`/projects/${fields.projectSlug}/units/${slug}`);
  revalidatePath("/admin/content/properties");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  redirect("/admin/content/properties");
}

export async function updateUnitContent(
  id: string,
  _prevState: UnitContentFormState,
  formData: FormData,
): Promise<UnitContentFormState> {
  const user = await requireContentPermission("content.update");

  const parsed = await parseUnitFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existingUnit = await unitContentRepository.findById(id);
  if (!existingUnit) return { error: "This unit no longer exists." };

  const photos = await resolveCoverAndGallery(formData, existingUnit, fields.name, "units");
  if (photos.error) return { error: photos.error };
  const plan = await resolveFloorPlan(formData, existingUnit.floorPlan, fields.name);
  if (plan.error) return { error: plan.error };

  const updated = await unitContentRepository.update(id, {
    projectSlug: fields.projectSlug,
    name: fields.name,
    unitNumber: fields.unitNumber,
    unitType: fields.unitType,
    status: fields.status,
    floor: fields.floor,
    area: fields.area,
    bedrooms: fields.bedrooms,
    bathrooms: fields.bathrooms,
    balconies: fields.balconies,
    parking: fields.parking,
    videoUrl: fields.videoUrl,
    tour360Url: fields.tour360Url,
    facing: fields.facing,
    price: fields.price,
    shortDescription: fields.shortDescription,
    description: fields.description,
    features: fields.features.length > 0 ? fields.features : undefined,
    coverImage: photos.coverImage,
    gallery: photos.gallery,
    floorPlan: plan.floorPlan,
  });
  if (!updated) return { error: "This unit no longer exists." };

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.unit.update",
    entityType: "Unit",
    entityId: id,
  });

  revalidatePath("/properties");
  revalidatePath(`/projects/${existingUnit.projectSlug}`);
  revalidatePath(`/projects/${existingUnit.projectSlug}/units/${existingUnit.slug}`);
  revalidatePath("/admin/content/properties");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  redirect("/admin/content/properties");
}

export async function deleteUnitContent(id: string): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const unit = await unitContentRepository.findById(id);
  if (!unit) return;

  await unitContentRepository.remove(id);

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.unit.delete",
    entityType: "Unit",
    entityId: id,
  });

  revalidatePath("/properties");
  revalidatePath(`/projects/${unit.projectSlug}`);
  revalidatePath(`/projects/${unit.projectSlug}/units/${unit.slug}`);
  revalidatePath("/admin/content/properties");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/saved");
  revalidatePath("/", "layout");
}

function revalidateUnitSurfaces(projectSlugs: Iterable<string>) {
  revalidatePath("/properties");
  revalidatePath("/projects");
  for (const slug of new Set(projectSlugs)) revalidatePath(`/projects/${slug}`);
  revalidatePath("/admin/content/properties");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/saved");
  revalidatePath("/", "layout");
}

/** One-click status change from the Properties list (Available → Reserved → Sold …) — no form, no page reload. */
export async function setUnitStatus(id: string, status: UnitStatus): Promise<void> {
  const user = await requireContentPermission("content.update");
  if (!isUnitStatus(status)) return;

  const unit = await unitContentRepository.findById(id);
  if (!unit || unit.status === status) return;

  await unitContentRepository.update(id, { status });
  await recordAuditEvent({ actorUserId: user.id, action: "content.unit.update", entityType: "Unit", entityId: id });
  revalidateUnitSurfaces([unit.projectSlug]);
}

/** Delete several units at once (the Properties list's checkboxes). */
export async function deleteUnitsContent(ids: string[]): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const touched = new Set<string>();
  for (const id of ids) {
    const unit = await unitContentRepository.findById(id);
    if (!unit) continue;
    await unitContentRepository.remove(id);
    await recordAuditEvent({ actorUserId: user.id, action: "content.unit.delete", entityType: "Unit", entityId: id });
    touched.add(unit.projectSlug);
  }
  revalidateUnitSurfaces(touched);
}

const MAX_BULK_UNITS = 200;

/**
 * Add many units to one project in a single save: one row per unit number
 * (typed or pasted, separated by new lines or commas), all sharing the same
 * type / status / size / price. Each can be opened and given its own photos,
 * floor plan and details afterwards. A name that already exists in the
 * project is skipped, not duplicated.
 */
export async function bulkCreateUnits(
  _prevState: UnitContentFormState,
  formData: FormData,
): Promise<UnitContentFormState> {
  const user = await requireContentPermission("content.create");

  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  const unitType = String(formData.get("unitType") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const prefix = String(formData.get("namePrefix") ?? "").trim();
  const numbersRaw = String(formData.get("numbers") ?? "");
  const area = String(formData.get("area") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const facing = String(formData.get("facing") ?? "").trim();
  const bedrooms = toOptionalNumber(String(formData.get("bedrooms") ?? ""));
  const bathrooms = toOptionalNumber(String(formData.get("bathrooms") ?? ""));
  const balconies = toOptionalNumber(String(formData.get("balconies") ?? ""));
  const parking = toOptionalNumber(String(formData.get("parking") ?? ""));
  const floor = toOptionalNumber(String(formData.get("floor") ?? ""));

  const projects = await projectContentRepository.list();
  const project = projects.find((p) => p.slug === projectSlug);
  if (!project) return { error: "Choose a project." };
  if (!unitType) return { error: "Enter a unit type, e.g. \"Apartment\"." };
  if (!isUnitStatus(status)) return { error: "Choose a status." };

  const numbers = Array.from(new Set(numbersRaw.split(/[\n,]+/).map((n) => n.trim()).filter(Boolean)));
  if (numbers.length === 0) return { error: "Enter at least one unit number." };
  if (numbers.length > MAX_BULK_UNITS) return { error: `Add up to ${MAX_BULK_UNITS} units at a time.` };

  const existing = await unitContentRepository.list();
  const takenNames = new Set(existing.filter((u) => u.projectSlug === projectSlug).map((u) => u.name.toLowerCase()));
  const takenSlugs = new Set(existing.map((u) => u.slug));

  let created = 0;
  for (const number of numbers) {
    const name = [prefix, number].filter(Boolean).join(" ");
    if (takenNames.has(name.toLowerCase())) continue;

    let slug = slugifyUnitName(name) || `unit-${created + 1}`;
    for (let n = 2; takenSlugs.has(slug); n++) slug = `${slugifyUnitName(name)}-${n}`;
    takenSlugs.add(slug);
    takenNames.add(name.toLowerCase());

    await unitContentRepository.create({
      id: randomUUID(),
      slug,
      projectSlug,
      name,
      unitNumber: number,
      unitType,
      status,
      floor,
      area: area || undefined,
      bedrooms,
      bathrooms,
      balconies,
      parking,
      facing: facing || undefined,
      price: price || undefined,
      shortDescription: `${unitType} ${number} at ${project.name}.`,
      description: `${unitType} ${number} at ${project.name}, ${project.location}.`,
      coverImage: { src: PLACEHOLDER_IMAGE, alt: name },
      gallery: [{ src: PLACEHOLDER_IMAGE, alt: name }],
    });
    created++;
  }

  if (created === 0) return { error: "Every one of those units already exists in this project." };

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.unit.bulk_create",
    entityType: "Project",
    entityId: project.id,
  });

  revalidateUnitSurfaces([projectSlug]);
  redirect(`/admin/content/properties?project=${encodeURIComponent(projectSlug)}&added=${created}`);
}
