import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { MediaBadges, hasMedia } from "@/components/media/MediaBadges";
import { cn } from "@/lib/utils";
import type { Project } from "@/content/projects";
import { ProjectStatus } from "./ProjectStatus";

export interface ProjectCardProps {
  project: Project;
  /**
   * "featured" — one large immersive presentation (homepage spotlight or
   * the top of the Projects showcase). "editorial" — large asymmetric
   * image + offset text, for a small curated sequence. "horizontal" —
   * even image/text split, for a straightforward list. "minimal" — name-led
   * row with a small supporting thumbnail, for a dense list.
   */
  variant?: "featured" | "editorial" | "horizontal" | "minimal";
  /** Editorial numbering (01, 02…) — shown on editorial/horizontal/minimal only; a featured project doesn't need it. */
  index?: number;
  /** horizontal only — alternates image side for rhythm across a list. */
  imagePosition?: "left" | "right";
  className?: string;
}

const HOVER_ZOOM = "transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-105";

function ExploreLink() {
  return (
    <span className="text-button text-accent inline-flex items-center gap-2">
      Explore Project
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1"
      />
    </span>
  );
}

function Eyebrow({ project }: { project: Project }) {
  return (
    <p className="text-caption text-fg-subtle mb-2 uppercase">
      {project.location} · {project.projectType}
    </p>
  );
}

export function ProjectCard({
  project,
  variant = "horizontal",
  index,
  imagePosition = "left",
  className,
}: ProjectCardProps) {
  const href = `/projects/${project.slug}`;
  const number = index !== undefined ? String(index + 1).padStart(2, "0") : undefined;

  if (variant === "featured") {
    return (
      <Link href={href} className={cn("group block", className)}>
        <Media
          ratio="wide"
          radius="md"
          src={project.coverImage.src}
          alt={project.coverImage.alt}
          caption={hasMedia(project) ? <MediaBadges videoUrl={project.videoUrl} tour360Url={project.tour360Url} /> : undefined}
          className={HOVER_ZOOM}
          sizes="100vw"
        />
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow project={project} />
            <h3 className="text-display-m group-hover:text-accent transition-colors duration-200">
              {project.name}
            </h3>
          </div>
          <ProjectStatus status={project.status} className="sm:mb-2" />
        </div>
        <p className="text-body-lg text-fg-muted mt-4 max-w-2xl">{project.shortDescription}</p>
        <div className="mt-6">
          <ExploreLink />
        </div>
      </Link>
    );
  }

  if (variant === "editorial") {
    return (
      <Link
        href={href}
        className={cn("group grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-6", className)}
      >
        <div className="lg:col-span-7">
          <Media
            ratio="standard"
            radius="md"
            src={project.coverImage.src}
            alt={project.coverImage.alt}
            caption={hasMedia(project) ? <MediaBadges videoUrl={project.videoUrl} tour360Url={project.tour360Url} /> : undefined}
            className={HOVER_ZOOM}
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:pt-12">
          {number && <span className="text-label text-fg-subtle tabular-nums">{number}</span>}
          <h3 className="text-h1 mt-3 group-hover:text-accent transition-colors duration-200">
            {project.name}
          </h3>
          <Eyebrow project={project} />
          <p className="text-body text-fg-muted mt-3">{project.shortDescription}</p>
          <ProjectStatus status={project.status} className="mt-4" />
          <div className="mt-6">
            <ExploreLink />
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "minimal") {
    return (
      <Link
        href={href}
        className={cn(
          "group border-border flex items-center justify-between gap-6 border-t py-8",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-6">
          {number && <span className="text-label text-fg-subtle w-8 shrink-0 tabular-nums">{number}</span>}
          <div className="min-w-0">
            <h3 className="text-h2 truncate group-hover:text-accent transition-colors duration-200">
              {project.name}
            </h3>
            <p className="text-caption text-fg-subtle mt-1 uppercase">
              {project.location} · <ProjectStatus status={project.status} className="text-fg-subtle inline-flex" />
            </p>
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-6 sm:flex">
          <div className="w-28 shrink-0">
            <Media
              ratio="square"
              radius="sm"
              src={project.coverImage.src}
              alt={project.coverImage.alt}
              caption={hasMedia(project) ? <MediaBadges videoUrl={project.videoUrl} tour360Url={project.tour360Url} /> : undefined}
              className={HOVER_ZOOM}
              sizes="112px"
            />
          </div>
          <ArrowRight
            aria-hidden
            className="text-fg-subtle size-5 shrink-0 transition-all duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1 group-hover:text-accent"
          />
        </div>
      </Link>
    );
  }

  // horizontal (default)
  return (
    <Link
      href={href}
      className={cn("group grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-12", className)}
    >
      <div className={cn(imagePosition === "right" && "sm:order-2")}>
        <Media
          ratio="standard"
          radius="md"
          src={project.coverImage.src}
          alt={project.coverImage.alt}
          caption={hasMedia(project) ? <MediaBadges videoUrl={project.videoUrl} tour360Url={project.tour360Url} /> : undefined}
          className={HOVER_ZOOM}
          sizes="(min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div>
        {number && <span className="text-label text-fg-subtle tabular-nums">{number}</span>}
        <h3 className="text-h2 mt-2 group-hover:text-accent transition-colors duration-200">
          {project.name}
        </h3>
        <Eyebrow project={project} />
        <p className="text-body text-fg-muted mt-3">{project.shortDescription}</p>
        <ProjectStatus status={project.status} className="mt-4" />
        <div className="mt-6">
          <ExploreLink />
        </div>
      </div>
    </Link>
  );
}
