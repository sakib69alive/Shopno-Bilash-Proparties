import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProjectCard } from "@/components/project/ProjectCard";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { projectContentRepository } from "@/features/projectContent/repository";

/**
 * Real projects only — filtered to ones still in an active development
 * stage (not completed/sold-out), since those are the ones a partnership
 * conversation is actually relevant to. Omits itself if none qualify.
 */
export async function ProjectOpportunities() {
  const projects = await projectContentRepository.list();
  const opportunities = projects
    .filter((p) => p.status !== "completed" && p.status !== "handed-over" && p.status !== "sold-out")
    .slice(0, 2);

  if (opportunities.length === 0) return null;

  return (
    <Section spacing="lg">
      <Container>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <Reveal as="p" className="text-label text-fg-subtle uppercase">
            Current Opportunities
          </Reveal>
          <Reveal delay={60}>
            <Link
              href="/projects"
              className="text-button text-accent inline-flex items-center gap-2"
            >
              View All Projects <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Reveal>
        </div>

        <div className="flex flex-col gap-16 lg:gap-20">
          {opportunities.map((project, i) => (
            <ProjectCard key={project.id} project={project} variant="horizontal" imagePosition={i % 2 === 0 ? "left" : "right"} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
