import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeToStore, removeFromStore, removeFromAnyStore } from "@/lib/uploadStore";
import { sanitizeSvg } from "@/lib/svgSanitize";
import { checkBlueprintSvg } from "@/lib/blueprintSvg";
import { normalizeBlueprintSvg } from "@/lib/svgNormalize";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — comfortably above a scanned deed/agreement, well under the 20MB Server Action body limit set in next.config.ts.
const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "svg", "doc", "docx"]);

export interface SavedFile {
  url: string;
  size: number;
  extension: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-100);
}

function getExtension(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  return ext;
}

/**
 * Writes an uploaded `File` (from a Server Action's `FormData`) via
 * `writeToStore()` — Netlify Blobs whenever actually deployed on Netlify,
 * local disk in dev (see `uploadStore.ts`'s own comment for why this is a
 * real attempt-then-fallback, not a pre-guessed environment check) — named
 * `<uuid>-<sanitized original name>` so two uploads never collide. Returns
 * the public URL path (usable directly as `fileUrl`/`<img src>`) and the
 * file's size/extension for display: a local-disk file keeps the old
 * `/uploads/...` path (served by Next's static `public/` folder), a
 * Blob-stored one is served through `/api/uploads/...`
 * (`src/app/api/uploads/[...path]/route.ts`) instead, since a Blob has no
 * filesystem path of its own to serve statically.
 */
export async function saveUploadedFile(file: File, subdir: string, options: { blueprint?: boolean; normalize?: boolean } = {}): Promise<SavedFile> {
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("File is too large — the limit is 15MB.");

  const extension = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file type — allowed: PDF, JPG, PNG, WEBP, SVG, DOC, DOCX.");
  }

  const fileName = `${randomUUID()}-${sanitizeFileName(file.name)}`;
  const relativePath = `${subdir}/${fileName}`;
  let buffer = Buffer.from(await file.arrayBuffer());
  if (extension === "svg") {
    // An SVG is code as much as a picture: keep the drawing, strip anything that could run or call out.
    let clean = sanitizeSvg(buffer.toString("utf8"));
    if (clean && (options.blueprint || options.normalize)) {
      // A blueprint is fitted to the app's cards on the way in: turned upright if its lettering proves it is sideways, trimmed of empty margins.
      clean = normalizeBlueprintSvg(clean).svg;
    }
    if (!clean) throw new Error("That SVG file couldn't be read. Export it again as a plain SVG, or upload a PNG / JPG instead.");
    if (options.blueprint) {
      // A floor-plan SVG that leans on filters, masks, pictures or thousands of shapes paints torn and slow on some
      // phones — refuse it here with the reason (the rules live in lib/blueprintSvg.ts; Settings → Blueprint AI checks a file first).
      const report = checkBlueprintSvg(clean);
      if (!report.ok) throw new Error(`This floor plan can't be used: ${report.errors.join(" ")} (Settings → Blueprint AI has a checker and the AI instructions.)`);
    }
    buffer = Buffer.from(clean, "utf8");
  }
  await writeToStore(relativePath, buffer);

  // Always the same URL scheme, whichever backend took the file: `/api/uploads/...` is served by a route that reads Blobs
  // or disk (so a backup restores cleanly onto a different host) and that enforces access rules on `documents/`. Serving
  // from `public/` would skip those rules and, in a production build, not even see files added after the build.
  return { url: `/api/uploads/${relativePath}`, size: buffer.length, extension };
}

/** Best-effort cleanup — a missing file (already deleted, or a path from before this store existed) is not an error. */
export async function deleteUploadedFile(url: string): Promise<void> {
  if (url.startsWith("/api/uploads/")) return removeFromAnyStore(url.slice("/api/uploads/".length));
  // Older records point straight at `public/uploads/`.
  if (url.startsWith("/uploads/")) return removeFromStore(url.slice("/uploads/".length), "disk");
}
