import type { NextRequest } from "next/server";
import sharp from "sharp";
import { publicBlueprintPath } from "@/lib/blueprintPreview";
import { sanitizeSvg } from "@/lib/svgSanitize";
import { readFromAnyStore } from "@/lib/uploadStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<Response> {
  const src = request.nextUrl.searchParams.get("src") ?? "";
  const path = publicBlueprintPath(`/uploads/${src}`);
  const size = request.nextUrl.searchParams.get("size");
  if (!path || (size !== "card" && size !== "detail")) return new Response(null, { status: 404 });

  try {
    const original = await readFromAnyStore(path);
    if (!original || original.length > 1024 * 1024) return new Response(null, { status: 404 });
    const svg = sanitizeSvg(original.toString("utf8"));
    if (!svg) return new Response(null, { status: 404 });

    const input = Buffer.from(svg);
    const options = { limitInputPixels: 16_000_000 };
    const { width, height } = await sharp(input, options).metadata();
    const longest = Math.max(width ?? 0, height ?? 0);
    if (!longest) return new Response(null, { status: 404 });

    const edge = size === "detail" ? 2560 : 1120;
    // Render the paths at the target resolution before sending a bitmap to the phone.
    const density = Math.min(1200, Math.max(1, Math.ceil(72 * edge / longest)));
    const preview = await sharp(input, { ...options, density })
      .resize({ width: edge, height: edge, fit: "inside" })
      .webp({ lossless: true })
      .toBuffer();

    return new Response(new Uint8Array(preview), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    // The original image remains the viewer's fallback if a preview cannot be made.
    return new Response(null, { status: 404 });
  }
}
