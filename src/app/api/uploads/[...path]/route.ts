import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { documentRepository } from "@/features/documents/repository";
import { STAFF_ROLES } from "@/config/roles";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { getOwnerDocuments } from "@/features/ownerPortal/queries";
import { readFromAnyStore } from "@/lib/uploadStore";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * Serves files written via `saveUploadedFile` when the active store is
 * Netlify Blobs (see `lib/uploadStore.ts`) — a Blob has no filesystem path
 * of its own for Next's static `public/` handler to serve, so this route
 * is the substitute.
 *

 * Everything under `documents/` (agreements, receipts, deeds — the files an admin attaches to a client, shareholder or
 * landowner) is NOT public: the request must come from a signed-in user, and the document's own visibility decides
 * who. Staff with `documents.view` may open them; a client needs a
 * document attached to their own account or one of their units.
 * Website images (projects, gallery, team, branding …) stay public, as they must be to appear on the site.
 */
async function mayReadDocument(relativePath: string): Promise<boolean> {
  const urls = new Set([`/api/uploads/${relativePath}`, `/uploads/${relativePath}`]);
  const doc = (await documentRepository.list()).find((d) => urls.has(d.fileUrl));
  if (!doc) return false;
  if (doc.visibility === "public") return true;

  const user = await getCurrentUser();
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return hasPermission(user.role, "documents.view");
  const owner = resolveOwnerContext(user);
  if (!owner) return false;
  const documents = await getOwnerDocuments(owner.ownerType, owner.ownerId);
  return documents.some((document) => document.id === doc.id);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (segments.some((s) => !s || s.includes("..") || s.includes("/") || s.includes("\\"))) return new NextResponse("Not found", { status: 404 });
  const relativePath = segments.join("/");

  const isPrivateArea = segments[0]?.toLowerCase() === "documents";
  // Fail closed: if the permission check or the store itself errors, nothing is served.
  let data: Buffer | null = null;
  try {
    if (isPrivateArea && !(await mayReadDocument(relativePath))) return new NextResponse("Not found", { status: 404 });
    data = await readFromAnyStore(relativePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!data) return new NextResponse("Not found", { status: 404 });

  const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": isPrivateArea ? "private, no-store" : "public, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex",
      // An SVG opened on its own address may never run scripts or load anything else.
      ...(extension === "svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
