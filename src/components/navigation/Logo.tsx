import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  /** Where the logo links to — "/" everywhere it's shown on the public site (including the login page); Admin/Portal shells override this to their own home route. */
  href?: string;
  /** Custom uploaded logo (Settings → Company → Logo) — falls back to the bundled default (tone-matched, see `tone`) when unset, so nothing changes for a site that hasn't uploaded one. Ignored while `mode === "name"`. A custom upload has no light/dark variant of its own, so it's shown as-is regardless of `tone`. */
  src?: string;
  /** "image" (default) shows the logo mark; "name" shows the company name as text instead, for a company without a finished logo image yet. */
  mode?: "image" | "name";
  /** Company name — used as the text mark in "name" mode, and always as the image's alt text / the link's accessible label. */
  displayName?: string;
  /**
   * Matches the header's own light/dark tone (see `Header`'s
   * `data-header-tone` detection). In "name" mode this flips the text color
   * the same way the nav links beside it do. In "image" mode — only for the
   * bundled default mark, transparent-background art with no self-contained
   * contrast — this picks the dark-ink variant (`/logo.webp`, for light
   * backdrops) or the light-ink variant (`/logo-inverted.webp`, for dark
   * backdrops/scrims) so the mark stays legible either way instead of
   * sitting in an awkward opaque white box.
   */
  tone?: "default" | "inverted";
}

// Intrinsic size of the bundled logo marks — kept explicit so next/image
// never has to guess an aspect ratio (and never causes layout shift). A
// custom uploaded logo is rendered at the same box regardless of its own
// real aspect ratio (object-contain), so this stays accurate enough either way.
const LOGO_WIDTH = 1200;
const LOGO_HEIGHT = 756;

const DEFAULT_NAME = "Shopno Bilash Properties";

/** The site's one logo mark, used at whatever height each call site sizes it to — always links home (or wherever `href` says). */
export function Logo({ className, href = "/", src, mode = "image", displayName, tone = "default" }: LogoProps) {
  const name = displayName || DEFAULT_NAME;
  const defaultSrc = tone === "inverted" ? "/logo-inverted.webp" : "/logo.webp";

  return (
    <Link
      href={href}
      aria-label={`${name} — home`}
      className={cn("inline-flex h-12 shrink-0 items-center transition-opacity duration-150 hover:opacity-85 sm:h-16", className)}
    >
      {mode === "name" ? (
        <span
          className={cn(
            "text-h4 truncate font-semibold",
            tone === "inverted" ? "text-white" : "text-fg",
          )}
        >
          {name}
        </span>
      ) : (
        <Image
          src={src || defaultSrc}
          alt={name}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          priority
          // Next's image optimizer flattens transparency onto an opaque
          // white background when it re-encodes an image (confirmed: the
          // optimized output's alpha channel is gone even though the
          // source file has real alpha) — exactly the "white box" this
          // transparent mark exists to avoid. The logo is already a small,
          // pre-compressed file at every call site, so there's nothing to
          // gain from Next re-processing it anyway.
          unoptimized
          className="h-full w-auto object-contain"
        />
      )}
    </Link>
  );
}
