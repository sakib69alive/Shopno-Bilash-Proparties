"use client";

import { useRegisterBarOverlay } from "@/components/mobile/MobileChrome";
import { usePageHeaderVariant } from "@/components/navigation/HeaderVariantContext";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";

/**
 * Project-specific hero — the real cover photo (once one exists) doing the
 * work the Home Hero's abstract skyline motif can't: this is the one place
 * on the site meant to eventually show actual architectural photography.
 * Same overlay-header + entrance-sequence + scroll-cue language as the
 * Home Hero for continuity, but text-anchored lower and quieter (no CTA
 * row — the whole page is the CTA here).
 */
export function ProjectHero({ project }: { project: Project }) {
  usePageHeaderVariant("overlay");
  useRegisterBarOverlay();

  return (
    <section data-bar-hero data-header-tone="dark" className="relative flex min-h-[100svh] flex-col overflow-hidden">
      <Media
        ratio="auto"
        src={project.coverImage.src}
        alt={project.coverImage.alt}
        priority
        sizes="100vw"
        containerClassName="absolute inset-0 h-full w-full"
        overlay
      />
      <div aria-hidden className="absolute inset-0 bg-black/25" />

      <Container className="relative flex flex-1 flex-col justify-end pt-32 pb-16 sm:pb-20 md:justify-center lg:justify-end lg:pb-24">
        <p
          className="hero-in text-label mb-4 text-white/70 uppercase sm:mb-6"
          style={{ animationDelay: "0ms" }}
        >
          {project.location} · {project.projectType}
        </p>

        <h1
          className="hero-in text-display-xl max-w-4xl text-balance text-white"
          style={{ animationDelay: "100ms" }}
        >
          {project.name}
        </h1>

        <p
          className="hero-in text-label mt-6 text-white/70 uppercase"
          style={{ animationDelay: "260ms" }}
        >
          {PROJECT_STATUS_LABEL[project.status]}
          {project.completionYear && ` · ${project.completionYear}`}
        </p>
      </Container>

      <div
        aria-hidden
        className="hero-in relative flex justify-center pb-8"
        style={{ animationDelay: "420ms" }}
      >
        <span className="relative h-12 w-px overflow-hidden bg-white/25">
          <span className="scroll-cue-dot absolute inset-x-0 top-0 h-3 bg-white" />
        </span>
      </div>
    </section>
  );
}
