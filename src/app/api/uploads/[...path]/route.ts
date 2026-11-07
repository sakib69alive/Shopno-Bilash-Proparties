import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isOwnerVisible } from "@/lib/documentVisibility";
import { documentRepository } from "@/features/documents/repository";
import { PORTAL_ROLES } from "@/config/roles";
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
 * is the substitute. Local-disk uploads never hit this route: they keep
 * their old `/uploads/...` URL, served statically as always.
 *

 * Everything under `documents/` (agreements, receipts, deeds — the files an admin attaches to a client, shareholder or
 * landowner) is NOT public: the request must come from a signed-in user, and the document's own visibility decides
 * who. Staff with `documents.view` may open any of them; a signed-in client only those marked owner-visible (their
 * file names also carry a random id, so one client can't guess another's). A file no record points to is refused.
 * Website images (projects, gallery, team, branding …) stay public, as they must be to appear on the site.
 */
async function mayReadDocument(relativePath: string): Promise<boolean> {
  const url = `/api/uploads/${relativePath}`;
  const doc = (await documentRepository.list()).find((d) => d.fileUrl === url);
  if (!doc) return false;
  if (doc.visibility === "public") return true;

  const user = await getCurrentUser();
  if (!user) return false;
  if (hasPermission(user.role, "documents.view")) return true;
  return PORTAL_ROLES.includes(user.role) && isOwnerVisible(doc);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (segments.some((s) => !s || s.includes("..") || s.includes("/") || s.includes("\\"))) return new NextResponse("Not found", { status: 404 });
  const relativePath = segments.join("/");

  const isPrivateArea = relativePath.startsWith("documents/");
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
