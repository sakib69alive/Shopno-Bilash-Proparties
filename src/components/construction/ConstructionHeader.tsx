import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";
import type { ConstructionProgress } from "@/content/construction";

/** Text-above-image, same editorial hierarchy as the Unit Hero — keeps this sub-page visually related to, but not a copy of, the Project Hero. */
export function ConstructionHeader({
  project,
  progress,
}: {
  project: Project;
  progress: ConstructionProgress;
}) {
  return (
    <Section spacing="md">
      <Container>
        <Reveal as="p" className="mb-6">
          <Link
            href={`/projects/${project.slug}`}
            className="text-label text-fg-subtle hover:text-fg inline-flex items-center gap-2 uppercase transition-colors"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            Back to {project.name}
          </Link>
        </Reveal>

        <Reveal delay={60} className="text-label text-fg-subtle mb-4 uppercase">
          Construction Progress
        </Reveal>

        <Reveal delay={100}>
          <h1 className="text-display-xl max-w-3xl text-balance">{project.name}</h1>
        </Reveal>

        <Reveal delay={180}>
          <p className="text-body-lg text-fg-muted mt-6 max-w-xl">
            {progress.introduction ??
              `${project.location} · ${PROJECT_STATUS_LABEL[project.status]}`}
          </p>
        </Reveal>
      </Container>

      <Reveal delay={240} className="mt-14">
        <Media ratio="hero" src={project.coverImage.src} alt={project.coverImage.alt} sizes="100vw" />
      </Reveal>
    </Section>
  );
}
