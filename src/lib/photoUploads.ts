import "server-only";
import { saveUploadedFile, deleteUploadedFile } from "@/lib/fileStorage";
import type { ImageAsset } from "@/content/shared";

export const PLACEHOLDER_IMAGE = "/placeholder-image.png";

/** A file input with nothing chosen still shows up in FormData as an empty File — treat that as "no file". */
export function getUploadedFile(formData: FormData, name: string): File | null {
  const file = formData.get(name);
  return file instanceof File && file.size > 0 ? file : null;
}

/**
 * Cover + gallery photos for a Website CMS record (project or unit). The
 * cover is replaced only when a new file is chosen; gallery photos are
 * appended, and any whose `src` was ticked in "Current photos"
 * (`removeGallery`) is dropped and deleted from storage. A record with a
 * gallery but no cover of its own gets its first gallery photo as cover, and
 * real photos replace the creation-time placeholder instead of sitting
 * beside it.
 */
export async function resolveCoverAndGallery(
  formData: FormData,
  existing: { coverImage: ImageAsset; gallery: ImageAsset[] } | undefined,
  name: string,
  subdir: string,
): Promise<{ coverImage?: ImageAsset; gallery?: ImageAsset[]; error?: string }> {
  const alt = `${name} photo`;
  let coverImage = existing?.coverImage;
  let gallery = existing?.gallery ?? [];

  try {
    const coverFile = getUploadedFile(formData, "coverImage");
    if (coverFile) {
      const saved = await saveUploadedFile(coverFile, subdir);
      if (coverImage) await deleteUploadedFile(coverImage.src);
      coverImage = { src: saved.url, alt };
    }

    const removed = new Set(formData.getAll("removeGallery").map(String));
    if (removed.size > 0) {
      for (const image of gallery) if (removed.has(image.src)) await deleteUploadedFile(image.src);
      gallery = gallery.filter((image) => !removed.has(image.src));
    }

    for (const entry of formData.getAll("galleryImages")) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      const saved = await saveUploadedFile(entry, subdir);
      gallery = [...gallery, { src: saved.url, alt }];
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that photo." };
  }

  const real = gallery.filter((image) => image.src !== PLACEHOLDER_IMAGE);
  if (real.length > 0) gallery = real;

  if (!coverImage || (coverImage.src === PLACEHOLDER_IMAGE && real.length > 0)) {
    coverImage = real[0] ?? { src: PLACEHOLDER_IMAGE, alt: name };
  }
  return { coverImage, gallery };
}
