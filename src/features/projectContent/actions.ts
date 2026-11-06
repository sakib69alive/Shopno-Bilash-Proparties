"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { projectContentRepository, slugifyProjectName } from "@/features/projectContent/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { checkMapField } from "@/lib/mapLinks";
import { checkTourField, checkVideoField } from "@/lib/mediaLinks";
import { PLACEHOLDER_IMAGE, resolveCoverAndGallery } from "@/lib/photoUploads";
import {
  BLUEPRINT_KIND_LABEL,
  BLUEPRINT_KIND_ORDER,
  type BlueprintKind,
  type ProjectBlueprint,
  type ProjectStatus,
} from "@/content/projects";

export interface ProjectContentFormState {
  error?: string;
}

const PROJECT_STATUSES: ProjectStatus[] = [
  "upcoming",
  "planning",
  "ongoing",
  "near-completion",
  "completed",
  "sold-out",
];

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as string[]).includes(value);
}

function toList(raw: string): string[] {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const BLUEPRINT_FIELD: Record<BlueprintKind, { file: string; remove: string; label?: string }> = {
  garage: { file: "blueprintGarage", remove: "removeBlueprintGarage" },
  floor: { file: "blueprintFloor", remove: "removeBlueprintFloor", label: "blueprintFloorLabel" },
  roof: { file: "blueprintRoof", remove: "removeBlueprintRoof" },
};

function getBlueprintFile(formData: FormData, name: string): File | null {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

/**
 * Applies the three blueprint inputs (garage / floor / roof) on top of
 * whatever the project already has: a new file replaces (and deletes) the
 * old one, the "remove" box drops it, otherwise the saved one is kept.
 * Returned in garage → floor → roof order, which is the order the public
 * page swipes through them.
 */
async function resolveBlueprints(
  formData: FormData,
  existing: ProjectBlueprint[] | undefined,
  projectName: string,
): Promise<{ blueprints?: ProjectBlueprint[]; error?: string }> {
  const result: ProjectBlueprint[] = [];

  for (const kind of BLUEPRINT_KIND_ORDER) {
    const field = BLUEPRINT_FIELD[kind];
    const current = existing?.find((b) => b.kind === kind);
    const customLabel = field.label ? String(formData.get(field.label) ?? "").trim() : "";
    const label = customLabel || BLUEPRINT_KIND_LABEL[kind];
    const file = getBlueprintFile(formData, field.file);

    if (file) {
      let saved;
      try {
        saved = await saveUploadedFile(file, "blueprints");
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Couldn't save that blueprint." };
      }
      if (current) await deleteUploadedFile(current.image.src);
      result.push({ kind, label, image: { src: saved.url, alt: `${BLUEPRINT_KIND_LABEL[kind]} blueprint of ${projectName}` } });
    } else if (current && formData.get(field.remove) === "on") {
      await deleteUploadedFile(current.image.src);
    } else if (current) {
      result.push({ ...current, label });
    }
  }

  return { blueprints: result.length > 0 ? result : undefined };
}

async function requireContentPermission(permission: "content.create" | "content.update" | "content.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

function parseProjectFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const buildingType = String(formData.get("buildingType") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
  const locationDescription = String(formData.get("locationDescription") ?? "").trim();
  const featuresRaw = String(formData.get("features") ?? "");
  const unitTypesRaw = String(formData.get("unitTypes") ?? "");
  const completionYearRaw = String(formData.get("completionYear") ?? "");
  const totalUnitsRaw = String(formData.get("totalUnits") ?? "");
  const availableUnitsRaw = String(formData.get("availableUnits") ?? "");
  const totalParkingCarRaw = String(formData.get("totalParkingCar") ?? "");
  const availableParkingCarRaw = String(formData.get("availableParkingCar") ?? "");
  const totalParkingBikeRaw = String(formData.get("totalParkingBike") ?? "");
  const availableParkingBikeRaw = String(formData.get("availableParkingBike") ?? "");
  const floorsRaw = String(formData.get("floors") ?? "");
  const featured = formData.get("featured") === "on";

  const video = checkVideoField(String(formData.get("videoUrl") ?? ""));
  if (video.error) return { error: video.error } as const;
  const tour = checkTourField(String(formData.get("tour360Url") ?? ""));
  if (tour.error) return { error: tour.error } as const;
  const map = checkMapField(String(formData.get("mapUrl") ?? ""));
  if (map.error) return { error: map.error } as const;

  if (!name || name.length < 3) return { error: "Name must be at least 3 characters." } as const;
  if (!location) return { error: "Enter a display location, e.g. \"Gulshan 2, Dhaka\"." } as const;
  if (!city) return { error: "Enter a city." } as const;
  if (!projectType) return { error: "Choose a project type." } as const;
  if (!isProjectStatus(status)) return { error: "Choose a valid status." } as const;
  if (!shortDescription || shortDescription.length < 10) return { error: "Short description must be at least 10 characters." } as const;
  if (!description || description.length < 10) return { error: "Description must be at least 10 characters." } as const;

  return {
    fields: {
      name,
      location,
      city,
      projectType,
      status,
      shortDescription,
      description,
      buildingType: buildingType || undefined,
      area: area || undefined,
      locationDescription: locationDescription || undefined,
      mapUrl: map.value,
      features: toList(featuresRaw),
      unitTypes: toList(unitTypesRaw),
      completionYear: toOptionalNumber(completionYearRaw),
      totalUnits: toOptionalNumber(totalUnitsRaw),
      availableUnits: toOptionalNumber(availableUnitsRaw),
      totalParkingCar: toOptionalNumber(totalParkingCarRaw),
      availableParkingCar: toOptionalNumber(availableParkingCarRaw),
      totalParkingBike: toOptionalNumber(totalParkingBikeRaw),
      availableParkingBike: toOptionalNumber(availableParkingBikeRaw),
      floors: toOptionalNumber(floorsRaw),
      videoUrl: video.value,
      tour360Url: tour.value,
      featured,
    },
  } as const;
}

export async function createProjectContent(
  _prevState: ProjectContentFormState,
  formData: FormData,
): Promise<ProjectContentFormState> {
  const user = await requireContentPermission("content.create");

  const parsed = parseProjectFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await projectContentRepository.list();
  let slug = slugifyProjectName(fields.name);
  if (existing.some((p) => p.slug === slug)) {
    slug = `${slug}-${existing.length + 1}`;
  }

  const blueprintResult = await resolveBlueprints(formData, undefined, fields.name);
  if (blueprintResult.error) return { error: blueprintResult.error };

  const photoResult = await resolveCoverAndGallery(formData, undefined, fields.name, "projects");
  if (photoResult.error) return { error: photoResult.error };

  const id = randomUUID();
  await projectContentRepository.create({
    id,
    slug,
    name: fields.name,
    location: fields.location,
    city: fields.city,
    projectType: fields.projectType,
    status: fields.status,
    shortDescription: fields.shortDescription,
    description: fields.description,
    buildingType: fields.buildingType,
    area: fields.area,
    locationDescription: fields.locationDescription,
    mapUrl: fields.mapUrl,
    features: fields.features.length > 0 ? fields.features : undefined,
    unitTypes: fields.unitTypes.length > 0 ? fields.unitTypes : undefined,
    completionYear: fields.completionYear,
    totalUnits: fields.totalUnits,
    availableUnits: fields.availableUnits,
    totalParkingCar: fields.totalParkingCar,
    availableParkingCar: fields.availableParkingCar,
    totalParkingBike: fields.totalParkingBike,
    availableParkingBike: fields.availableParkingBike,
    floors: fields.floors,
    videoUrl: fields.videoUrl,
    tour360Url: fields.tour360Url,
    featured: fields.featured,
    coverImage: photoResult.coverImage ??{ src: PLACEHOLDER_IMAGE, alt: fields.name },
    gallery: photoResult.gallery?.length ? photoResult.gallery : [{ src: PLACEHOLDER_IMAGE, alt: fields.name }],
    blueprints: blueprintResult.blueprints,
  });

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.project.create",
    entityType: "Project",
    entityId: id,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${slug}`);
  revalidatePath(`/projects/${slug}/construction`);
  revalidatePath("/admin/content/projects");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/saved");
  revalidatePath("/", "layout");
  revalidatePath("/gallery");
  revalidatePath("/landowners");
  revalidatePath("/services");
  revalidatePath("/construction");
  redirect("/admin/content/projects");
}

export async function updateProjectContent(
  id: string,
  _prevState: ProjectContentFormState,
  formData: FormData,
): Promise<ProjectContentFormState> {
  const user = await requireContentPermission("content.update");

  const parsed = parseProjectFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existingProject = await projectContentRepository.findById(id);
  if (!existingProject) return { error: "This project no longer exists." };

  const blueprintResult = await resolveBlueprints(formData, existingProject.blueprints, fields.name);
  if (blueprintResult.error) return { error: blueprintResult.error };

  const photoResult = await resolveCoverAndGallery(formData, existingProject, fields.name, "projects");
  if (photoResult.error) return { error: photoResult.error };

  const updated = await projectContentRepository.update(id, {
    name: fields.name,
    location: fields.location,
    city: fields.city,
    projectType: fields.projectType,
    status: fields.status,
    shortDescription: fields.shortDescription,
    description: fields.description,
    buildingType: fields.buildingType,
    area: fields.area,
    locationDescription: fields.locationDescription,
    mapUrl: fields.mapUrl,
    features: fields.features.length > 0 ? fields.features : undefined,
    unitTypes: fields.unitTypes.length > 0 ? fields.unitTypes : undefined,
    completionYear: fields.completionYear,
    totalUnits: fields.totalUnits,
    availableUnits: fields.availableUnits,
    totalParkingCar: fields.totalParkingCar,
    availableParkingCar: fields.availableParkingCar,
    totalParkingBike: fields.totalParkingBike,
    availableParkingBike: fields.availableParkingBike,
    floors: fields.floors,
    videoUrl: fields.videoUrl,
    tour360Url: fields.tour360Url,
    featured: fields.featured,
    blueprints: blueprintResult.blueprints,
    coverImage: photoResult.coverImage,
    gallery: photoResult.gallery,
  });
  if (!updated) return { error: "This project no longer exists." };

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.project.update",
    entityType: "Project",
    entityId: id,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${existingProject.slug}`);
  revalidatePath(`/projects/${existingProject.slug}/construction`);
  revalidatePath("/admin/content/projects");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/saved");
  revalidatePath("/", "layout");
  revalidatePath("/gallery");
  revalidatePath("/landowners");
  revalidatePath("/services");
  revalidatePath("/construction");
  redirect("/admin/content/projects");
}

export async function deleteProjectContent(id: string): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const project = await projectContentRepository.findById(id);
  if (!project) return;

  await projectContentRepository.remove(id);

  await recordAuditEvent({
    actorUserId: user.id,
    action: "content.project.delete",
    entityType: "Project",
    entityId: id,
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${project.slug}`);
  revalidatePath(`/projects/${project.slug}/construction`);
  revalidatePath("/admin/content/projects");
  revalidatePath("/sitemap");
  revalidatePath("/sitemap.xml");
  revalidatePath("/saved");
  revalidatePath("/", "layout");
  revalidatePath("/gallery");
  revalidatePath("/landowners");
  revalidatePath("/services");
  revalidatePath("/construction");
}
