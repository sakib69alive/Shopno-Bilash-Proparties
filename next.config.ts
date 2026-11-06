import type { NextConfig } from "next";

/**
 * Headers that are safe to apply site-wide without risking the public site's
 * own image/font/video/map loading. A full script-and-image
 * Content-Security-Policy is deliberately NOT included (the site embeds
 * YouTube/Vimeo/Facebook/Google Maps/360 tours and loads Google Fonts, and
 * getting that wrong silently breaks pages) — but the CSP directives below
 * restrict only what can't break any of that: who may frame the site, which
 * <base>/form targets are allowed, and no plugins.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  // Lets a second build/server run beside the dev server (e.g. NEXT_DIST_DIR=.next-check) without clobbering `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Prisma's query engine ships a native binary — bundling it (the default
  // for anything imported into a Server Component) breaks under Turbopack.
  // Keeping it external makes Next.js `require()` it at runtime instead.
  serverExternalPackages: ["@prisma/client"],
  // Dev only: lets a phone on the same Wi-Fi (e.g. http://192.168.1.195:3000)
  // load the dev scripts. Without this Next 16 blocks them, the page never
  // hydrates, and reveal-on-scroll content stays invisible (blank sections).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  // Every real upload goes through `next/image` via `<Media>`, which
  // refuses any external host by default — this one exception is for
  // hotlinked Unsplash demo photography (free, real-estate stock images
  // used to populate a sample project), not a general external-image
  // allowlist.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  // Default Server Action body limit is 1MB — too small for a scanned
  // deed or agreement PDF (see src/lib/fileStorage.ts's own 15MB cap).
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
