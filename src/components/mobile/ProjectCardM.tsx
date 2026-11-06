import Link from "next/link";
import { MapPin } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { MediaBadges } from "@/components/media/MediaBadges";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type Project } from "@/content/projects";
import { cn } from "@/lib/utils";

export interface ProjectCardMProps {
  project: Project;
  /** "rail" is a fixed-width tall card for a swipe `Rail`; "full" fills its column. */
  layout?: "rail" | "full";
  className?: string;
}

/** Large photo card: project name, location and real status over a dark scrim at the foot of the photo. */
export function ProjectCardM({ project, layout = "full", className }: ProjectCardMProps) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className={cn(
        "relative block overflow-hidden rounded-[var(--m-radius-card)] transition-transform duration-150 active:scale-[0.98]",
        layout === "rail" ? "aspect-[4/5] w-[78vw] max-w-[320px]" : "aspect-[4/3] w-full",
        className,
      )}
    >
      <Media
        ratio="auto"
        src={project.coverImage.src}
        alt={project.coverImage.alt}
        sizes={layout === "rail" ? "(min-width: 640px) 320px, 78vw" : "(min-width: 768px) 50vw, 100vw"}
        containerClassName="absolute inset-0"
        overlay
      />
      <span className="bg-bg text-fg absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase">
        <span className={cn("size-1.5 rounded-full", PROJECT_STATUS_TONE[project.status])} aria-hidden />
        {PROJECT_STATUS_LABEL[project.status]}
      </span>
      <MediaBadges videoUrl={project.videoUrl} tour360Url={project.tour360Url} className="absolute top-3 right-3" />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <h3 className="font-display text-xl leading-tight font-semibold">{project.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
          <MapPin aria-hidden className="size-4 shrink-0" />
          <span className="line-clamp-1">{project.location}</span>
        </p>
      </div>
    </Link>
  );
}
