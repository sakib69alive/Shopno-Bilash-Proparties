import { NextResponse, type NextRequest } from "next/server";
import { readFromBlobStore } from "@/lib/uploadStore";

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
 * their old `/uploads/...` URL, served statically as always. Publicly
 * reachable with no auth check, same as every file under `public/uploads/`
 * already was before this route existed — not a security change, just a
 * like-for-like replacement of how the bytes get to the browser.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const relativePath = segments.join("/");

  const data = await readFromBlobStore(relativePath);
  if (!data) return new NextResponse("Not found", { status: 404 });

  const extension = relativePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // An SVG opened on its own address may never run scripts or load anything else.
      ...(extension === "svg" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
    },
  });
}
