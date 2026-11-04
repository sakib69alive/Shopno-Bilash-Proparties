import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/ui/Gallery";
import { ProjectBlueprints } from "@/components/project/ProjectBlueprints";
import { ProjectDesignStory } from "@/components/project/ProjectDesignStory";
import { ProjectEnquiryCTA } from "@/components/project/ProjectEnquiryCTA";
import { ProjectFacts } from "@/components/project/ProjectFacts";
import { ProjectHero } from "@/components/project/ProjectHero";
import { ProjectIntroduction } from "@/components/project/ProjectIntroduction";
import { ProjectLocation } from "@/components/project/ProjectLocation";
import { ProjectStatusAndAvailability } from "@/components/project/ProjectStatusAndAvailability";
import { constructionProgress } from "@/content/construction";
import { findProjectContentBySlug } from "@/features/projectContent/repository";
import { unitContentRepository } from "@/features/unitContent/repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// No `generateStaticParams` — the project list is now admin-editable
// (Website CMS), so this route is fully dynamic, same as CMS Step 1
// made `/news/[slug]` dynamic for the same reason.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await findProjectContentBySlug(slug);
  if (!project) return {};

  return {
    title: project.name,
    description: project.shortDescription,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.name,
      description: project.shortDescription,
      type: "website",
      images: [{ url: project.coverImage.src }],
    },
  };
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await findProjectContentBySlug(slug);

  if (!project) notFound();

  const allUnits = await unitContentRepository.list();
  const projectUnits = allUnits.filter((u) => u.projectSlug === project.slug);
  const hasConstructionProgress = constructionProgress.some((p) => p.projectSlug === project.slug);

  return (
    <>
      <ProjectHero project={project} />
      <ProjectIntroduction project={project} />
      <ProjectFacts project={project} />
      <ProjectBlueprints blueprints={project.blueprints} />
      <ProjectDesignStory project={project} />
      <ProjectLocation project={project} />
      <Gallery images={project.gallery} label="Gallery" />
      <ProjectStatusAndAvailability
        project={project}
        units={projectUnits}
        hasConstructionProgress={hasConstructionProgress}
      />
      <ProjectEnquiryCTA project={project} hasUnits={projectUnits.length > 0} />
    </>
  );
}
