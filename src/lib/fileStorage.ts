import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeToStore, removeFromStore, type StoreKind } from "@/lib/uploadStore";
import { sanitizeSvg } from "@/lib/svgSanitize";

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
export async function saveUploadedFile(file: File, subdir: string): Promise<SavedFile> {
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
    const clean = sanitizeSvg(buffer.toString("utf8"));
    if (!clean) throw new Error("That SVG file couldn't be read. Export it again as a plain SVG, or upload a PNG / JPG instead.");
    buffer = Buffer.from(clean, "utf8");
  }
  const kind = await writeToStore(relativePath, buffer);

  const urlPrefix = kind === "blob" ? "/api/uploads" : "/uploads";
  return { url: `${urlPrefix}/${relativePath}`, size: buffer.length, extension };
}

/** Best-effort cleanup — a missing file (already deleted, or a path from before this store existed) is not an error. */
export async function deleteUploadedFile(url: string): Promise<void> {
  const parsed: { relativePath: string; kind: StoreKind } | null = url.startsWith("/api/uploads/")
    ? { relativePath: url.slice("/api/uploads/".length), kind: "blob" }
    : url.startsWith("/uploads/")
      ? { relativePath: url.slice("/uploads/".length), kind: "disk" }
      : null;
  if (!parsed) return;

  await removeFromStore(parsed.relativePath, parsed.kind);
}
