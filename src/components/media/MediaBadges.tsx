import { Play } from "lucide-react";
import { parseTourUrl, parseVideoUrl } from "@/lib/mediaLinks";
import { cn } from "@/lib/utils";

export interface MediaBadgesProps {
  videoUrl?: string;
  tour360Url?: string;
  className?: string;
}

/** True when there is at least one playable video or 360° tour link. */
export function hasMedia(entity: { videoUrl?: string; tour360Url?: string }): boolean {
  return Boolean(parseVideoUrl(entity.videoUrl) || parseTourUrl(entity.tour360Url));
}

const BADGE =
  "bg-bg/95 text-fg flex h-8 min-w-8 items-center justify-center gap-1 rounded-full px-2 text-[11px] leading-none font-bold tracking-wide shadow-sm";

/**
 * Small "this one has a video / a 360° tour" marks for the corner of a photo
 * card. Purely a hint (the card itself is the link) — and it only draws what
 * the admin actually supplied, so a project with neither shows nothing at all.
 * Position it from the caller with `className` (e.g. `absolute bottom-3 left-3`).
 */
export function MediaBadges({ videoUrl, tour360Url, className }: MediaBadgesProps) {
  const video = parseVideoUrl(videoUrl);
  const tour = parseTourUrl(tour360Url);
  if (!video && !tour) return null;

  return (
    <span className={cn("pointer-events-none flex items-center gap-1.5", className)}>
      {video && (
        <span className={BADGE} title="Has a video">
          <Play aria-hidden className="size-3.5 fill-current" />
          <span className="sr-only">Has a video</span>
        </span>
      )}
      {tour && (
        <span className={BADGE} title="Has a 360° tour">
          <span aria-hidden>360°</span>
          <span className="sr-only">Has a 360° tour</span>
        </span>
      )}
    </span>
  );
}
