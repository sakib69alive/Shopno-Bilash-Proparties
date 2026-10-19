import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LogoProps {
  className?: string;
  /** Where the logo links to — "/" everywhere it's shown on the public site (including the login page); Admin/Portal shells override this to their own home route. */
  href?: string;
  /** Custom uploaded logo (Settings → Company → Logo) — falls back to the bundled `/logo.webp` when unset, so nothing changes for a site that hasn't uploaded one. Ignored while `mode === "name"`. */
  src?: string;
  /** "image" (default) shows the logo mark; "name" shows the company name as text instead, for a company without a finished logo image yet. */
  mode?: "image" | "name";
  /** Company name — used as the text mark in "name" mode, and always as the image's alt text / the link's accessible label. */
  displayName?: string;
  /**
   * Text-mode only: matches the header's own light/dark tone (see
   * `Header`'s `data-header-tone` detection) — the image mark carries its
   * own contrast so this is irrelevant to it, but plain text needs to
   * flip color the same way the nav links beside it do.
   */
  tone?: "default" | "inverted";
}

// Intrinsic size of public/logo.webp — kept explicit so next/image never
// has to guess an aspect ratio (and never causes layout shift). A custom
// uploaded logo is rendered at the same box regardless of its own real
// aspect ratio (object-contain), so this stays accurate enough either way.
const LOGO_WIDTH = 1200;
const LOGO_HEIGHT = 912;

const DEFAULT_NAME = "Shopno Bilash Properties";

/** The site's one logo mark, used at whatever height each call site sizes it to — always links home (or wherever `href` says). */
export function Logo({ className, href = "/", src, mode = "image", displayName, tone = "default" }: LogoProps) {
  const name = displayName || DEFAULT_NAME;

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
          src={src || "/logo.webp"}
          alt={name}
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          priority
          className="h-full w-auto object-contain"
        />
      )}
    </Link>
  );
}
