"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { galleryRepository } from "@/features/gallery/repository";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import { GALLERY_CATEGORIES, type GalleryCategory } from "@/content/gallery";
import { projects } from "@/content/projects";

export interface GalleryFormState {
  error?: string;
}

function isGalleryCategory(value: string): value is GalleryCategory {
  return (GALLERY_CATEGORIES as readonly string[]).includes(value);
}

async function requireContentPermission(permission: "content.create" | "content.update" | "content.delete") {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, permission)) throw new Error("Forbidden");
  return user;
}

function parseGalleryFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  const alt = String(formData.get("alt") ?? "").trim();
  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  if (!isGalleryCategory(category)) return { error: "Choose a valid category." } as const;
  if (!alt || alt.length < 3) return { error: "Describe the image (alt text) in at least 3 characters." } as const;

  return {
    fields: {
      title: title || undefined,
      category,
      caption: caption || undefined,
      alt,
      projectSlug: projectSlug && projects.some((p) => p.slug === projectSlug) ? projectSlug : undefined,
      date: date || undefined,
    },
  } as const;
}

/** A file input with nothing chosen still shows up in FormData as an empty File — treat that as "no file". */
function getUploadedFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function createGalleryItem(_prevState: GalleryFormState, formData: FormData): Promise<GalleryFormState> {
  const user = await requireContentPermission("content.create");

  const parsed = parseGalleryFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const file = getUploadedFile(formData);
  if (!file) return { error: "Choose an image to upload." };

  let saved;
  try {
    saved = await saveUploadedFile(file, "gallery");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that image." };
  }

  const id = randomUUID();
  await galleryRepository.create({
    id,
    title: fields.title,
    category: fields.category,
    image: { src: saved.url, alt: fields.alt },
    caption: fields.caption,
    projectSlug: fields.projectSlug,
    date: fields.date,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "content.gallery.create", entityType: "GalleryImage", entityId: id });

  revalidatePath("/gallery");
  revalidatePath("/admin/content/gallery");
  redirect("/admin/content/gallery");
}

export async function updateGalleryItem(
  id: string,
  _prevState: GalleryFormState,
  formData: FormData,
): Promise<GalleryFormState> {
  const user = await requireContentPermission("content.update");

  const parsed = parseGalleryFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await galleryRepository.findById(id);
  if (!existing) return { error: "This image no longer exists." };

  const newFile = getUploadedFile(formData);
  let src = existing.image.src;

  if (newFile) {
    let saved;
    try {
      saved = await saveUploadedFile(newFile, "gallery");
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Couldn't save that image." };
    }
    await deleteUploadedFile(existing.image.src);
    src = saved.url;
  }

  const updated = await galleryRepository.update(id, {
    title: fields.title,
    category: fields.category,
    image: { src, alt: fields.alt },
    caption: fields.caption,
    projectSlug: fields.projectSlug,
    date: fields.date,
  });
  if (!updated) return { error: "This image no longer exists." };

  await recordAuditEvent({ actorUserId: user.id, action: "content.gallery.update", entityType: "GalleryImage", entityId: id });

  revalidatePath("/gallery");
  revalidatePath("/admin/content/gallery");
  redirect("/admin/content/gallery");
}

export async function deleteGalleryItem(id: string): Promise<void> {
  const user = await requireContentPermission("content.delete");

  const existing = await galleryRepository.findById(id);
  if (!existing) return;

  await galleryRepository.remove(id);
  await deleteUploadedFile(existing.image.src);

  await recordAuditEvent({ actorUserId: user.id, action: "content.gallery.delete", entityType: "GalleryImage", entityId: id });

  revalidatePath("/gallery");
  revalidatePath("/admin/content/gallery");
}

const MAX_BULK_PHOTOS = 40;

/**
 * Upload many photos in one save (Admin → Gallery → Add photos): they all
 * share a category, an optional project and an optional date, and each gets
 * its filename as a placeholder alt text — open any of them later to give it
 * a proper title or caption. Photos that uploaded are kept even if one file
 * is rejected, and the message says which.
 */
export async function bulkCreateGalleryItems(_prevState: GalleryFormState, formData: FormData): Promise<GalleryFormState> {
  const user = await requireContentPermission("content.create");

  const category = String(formData.get("category") ?? "");
  if (!isGalleryCategory(category)) return { error: "Choose a category." };
  const projectSlug = String(formData.get("projectSlug") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose at least one photo." };
  if (files.length > MAX_BULK_PHOTOS) return { error: `Add up to ${MAX_BULK_PHOTOS} photos at a time.` };

  const { projectContentRepository } = await import("@/features/projectContent/repository");
  const liveProjects = await projectContentRepository.list();
  const validProject = projectSlug && liveProjects.some((p) => p.slug === projectSlug) ? projectSlug : undefined;

  let added = 0;
  const failed: string[] = [];
  for (const file of files) {
    try {
      const saved = await saveUploadedFile(file, "gallery");
      const label = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Gallery photo";
      await galleryRepository.create({
        id: randomUUID(),
        category,
        image: { src: saved.url, alt: label },
        projectSlug: validProject,
        date: date || undefined,
      });
      added++;
    } catch (err) {
      failed.push(`${file.name} (${err instanceof Error ? err.message : "could not be saved"})`);
    }
  }

  if (added === 0) return { error: `Nothing was added. ${failed.join("; ")}` };

  await recordAuditEvent({ actorUserId: user.id, action: "content.gallery.create", entityType: "GalleryImage", entityId: `bulk-${added}` });

  revalidatePath("/gallery");
  revalidatePath("/admin/content/gallery");
  if (failed.length > 0) return { error: `Added ${added}, but these did not upload: ${failed.join("; ")}` };
  redirect(`/admin/content/gallery?added=${added}`);
}
