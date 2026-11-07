import "server-only";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const BLOB_STORE_NAME = "uploads";

export type StoreKind = "blob" | "disk";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Thrown by `@netlify/blobs` (as `MissingBlobsEnvironmentError`, an
 * internal class not exported from its public API — matched by `.name`
 * instead) whenever there's no ambient Blobs context to work with, i.e.
 * genuinely NOT running on Netlify. The one signal this module trusts to
 * mean "fall back to disk" — see the big comment on `writeToStore` below
 * for why a real attempt replaced an earlier environment-variable guess.
 */
function isMissingBlobsEnvironment(error: unknown): boolean {
  return error instanceof Error && error.name === "MissingBlobsEnvironmentError";
}

async function blobWrite(relativePath: string, data: Buffer): Promise<void> {
  await getStore(BLOB_STORE_NAME).set(relativePath, toArrayBuffer(data));
}

async function blobRead(relativePath: string): Promise<Buffer | null> {
  const result = await getStore(BLOB_STORE_NAME).get(relativePath, { type: "arrayBuffer" });
  return result ? Buffer.from(result) : null;
}

async function blobRemove(relativePath: string): Promise<void> {
  await getStore(BLOB_STORE_NAME).delete(relativePath);
}

async function blobList(): Promise<string[]> {
  const result = await getStore(BLOB_STORE_NAME).list();
  return result.blobs.map((blob) => blob.key);
}

async function diskWrite(relativePath: string, data: Buffer): Promise<void> {
  const destination = path.join(UPLOADS_ROOT, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data);
}

async function diskRead(relativePath: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(UPLOADS_ROOT, relativePath));
  } catch {
    return null;
  }
}

async function diskRemove(relativePath: string): Promise<void> {
  try {
    await unlink(path.join(UPLOADS_ROOT, relativePath));
  } catch {
    // Already gone — nothing to do.
  }
}

async function diskList(): Promise<string[]> {
  try {
    const entries = await readdir(UPLOADS_ROOT, { recursive: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(UPLOADS_ROOT, entry);
      if ((await stat(full)).isFile()) files.push(entry.split(path.sep).join("/"));
    }
    return files;
  } catch {
    return []; // No uploads directory yet (a fresh install, or genuinely nothing written locally) — not an error.
  }
}

/**
 * Netlify's serverless functions have no persistent disk — the same reason
 * this app's database moved from a local SQLite file to Neon Postgres.
 * `saveUploadedFile`/`deleteUploadedFile` used to write straight to
 * `public/uploads/` on local disk, which works in local dev (a long-running
 * process, real disk) but silently loses every uploaded file on Netlify (a
 * fresh, isolated container per invocation, no shared writable disk).
 *
 * The first version of this fix picked a backend by checking
 * `process.env.NETLIFY === "true"` — confirmed WRONG in practice: that
 * variable is set at build time but wasn't present in the actual deployed
 * Server Action runtime, so uploads kept falling through to disk and
 * failing with `ENOENT: ... mkdir '/var/task/public'` (a deployed
 * function's own filesystem has no writable `public/`). This version
 * doesn't guess — `write()` always attempts Netlify Blobs first (the
 * correct backend whenever really running on Netlify) and only falls back
 * to disk when Blobs itself reports there's no ambient context available
 * (`MissingBlobsEnvironmentError`), which is genuinely local dev. Whichever
 * one actually succeeded is returned as `StoreKind`, so `fileStorage.ts`
 * can build the right URL instead of assuming one.
 */
export async function writeToStore(relativePath: string, data: Buffer): Promise<StoreKind> {
  try {
    await blobWrite(relativePath, data);
    return "blob";
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) throw error;
    await diskWrite(relativePath, data);
    return "disk";
  }
}

export async function removeFromStore(relativePath: string, kind: StoreKind): Promise<void> {
  if (kind === "blob") await blobRemove(relativePath);
  else await diskRemove(relativePath);
}

/** Only for `/api/uploads/[...path]` — that URL is only ever handed out for a Blob-backed write, so it only ever needs to read Blobs. */
export async function readFromBlobStore(relativePath: string): Promise<Buffer | null> {
  return blobRead(relativePath);
}

export async function readFromStore(relativePath: string, kind: StoreKind): Promise<Buffer | null> {
  return kind === "blob" ? blobRead(relativePath) : diskRead(relativePath);
}

/** Every file across both backends — for the full-backup zip, which predates this split and should still capture everything regardless of where a given file landed. */
export async function listAllStoredFiles(): Promise<{ relativePath: string; kind: StoreKind }[]> {
  const files: { relativePath: string; kind: StoreKind }[] = [];

  try {
    const blobPaths = await blobList();
    files.push(...blobPaths.map((relativePath) => ({ relativePath, kind: "blob" as const })));
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) throw error;
  }

  const diskPaths = await diskList();
  files.push(...diskPaths.map((relativePath) => ({ relativePath, kind: "disk" as const })));

  return files;
}

/**
 * Reads a file wherever it actually lives: Netlify Blobs first, then local disk. The `/api/uploads/...` route uses
 * this so one URL scheme works on every host — a Netlify demo, a VPS with a real disk, or a restore of a backup made
 * on the other kind of host (the backup carries the files; it can't carry "which backend they were on").
 */
export async function readFromAnyStore(relativePath: string): Promise<Buffer | null> {
  try {
    const fromBlob = await blobRead(relativePath);
    if (fromBlob) return fromBlob;
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) throw error;
  }
  return diskRead(relativePath);
}

/** Counterpart of `readFromAnyStore` — removes the file from whichever backend holds it. */
export async function removeFromAnyStore(relativePath: string): Promise<void> {
  try {
    await blobRemove(relativePath);
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) throw error;
  }
  await diskRemove(relativePath);
}
