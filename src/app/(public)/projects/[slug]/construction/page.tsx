import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { ConstructionDetailM } from "@/components/mobile/ConstructionM";
import { ConstructionBeforeAfter } from "@/components/construction/ConstructionBeforeAfter";
import { ConstructionClosingCTA } from "@/components/construction/ConstructionClosingCTA";
import { ConstructionCurrentAndUpcoming } from "@/components/construction/ConstructionCurrentAndUpcoming";
import { ConstructionHeader } from "@/components/construction/ConstructionHeader";
import { ConstructionJournal } from "@/components/construction/ConstructionJournal";
import { ConstructionOverallProgress } from "@/components/construction/ConstructionOverallProgress";
import { ConstructionTimeline } from "@/components/construction/ConstructionTimeline";
import { constructionProgress } from "@/content/construction";
import { findProjectContentBySlug } from "@/features/projectContent/repository";
import { unitContentRepository } from "@/features/unitContent/repository";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await findProjectContentBySlug(slug);
  if (!project) return {};

  return {
    title: `Construction Progress — ${project.name}`,
    description: `Follow the construction progress of ${project.name}.`,
    alternates: { canonical: `/projects/${project.slug}/construction` },
  };
}

export default async function ConstructionProgressPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await findProjectContentBySlug(slug);
  const progress = constructionProgress.find((p) => p.projectSlug === slug);

  if (!project || !progress) notFound();

  const units = await unitContentRepository.list();
  const hasUnits = units.some((u) => u.projectSlug === slug);

  return (
    <>
      <ConstructionDetailM project={project} progress={progress} hasUnits={hasUnits} />
      <DesktopOnly>
      <ConstructionHeader project={project} progress={progress} />
      <ConstructionOverallProgress progress={progress} />
      <ConstructionTimeline progress={progress} />
      <ConstructionJournal progress={progress} />
      <ConstructionBeforeAfter progress={progress} />
      <ConstructionCurrentAndUpcoming progress={progress} />
      <ConstructionClosingCTA project={project} hasUnits={hasUnits} />
      </DesktopOnly>
    </>
  );
}
