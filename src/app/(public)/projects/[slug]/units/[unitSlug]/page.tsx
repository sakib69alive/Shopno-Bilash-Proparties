import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { UnitDetailM } from "@/components/mobile/UnitDetailM";
import { Gallery } from "@/components/ui/Gallery";
import { UnitAvailabilityPrice } from "@/components/property/UnitAvailabilityPrice";
import { UnitDescription } from "@/components/property/UnitDescription";
import { UnitEnquiryCTA } from "@/components/property/UnitEnquiryCTA";
import { UnitFloorPlan } from "@/components/property/UnitFloorPlan";
import { UnitHero } from "@/components/property/UnitHero";
import { UnitProjectContext } from "@/components/property/UnitProjectContext";
import { UnitRelated } from "@/components/property/UnitRelated";
import { UnitSpecifications } from "@/components/property/UnitSpecifications";
import { findProjectContentBySlug } from "@/features/projectContent/repository";
import { unitContentRepository, findUnitContentBySlug } from "@/features/unitContent/repository";

interface PageProps {
  params: Promise<{ slug: string; unitSlug: string }>;
}

// No `generateStaticParams` — units are now admin-editable (Website CMS),
// so this route is fully dynamic, same reasoning as the Projects CMS
// migration removing it from `/projects/[slug]`.

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, unitSlug } = await params;
  const unit = await findUnitContentBySlug(slug, unitSlug);
  if (!unit) return {};

  return {
    title: unit.name,
    description: unit.shortDescription,
    alternates: { canonical: `/projects/${slug}/units/${unit.slug}` },
    openGraph: {
      title: unit.name,
      description: unit.shortDescription,
      type: "website",
      images: [{ url: unit.coverImage.src }],
    },
  };
}

export default async function UnitDetailsPage({ params }: PageProps) {
  const { slug, unitSlug } = await params;
  const [project, unit, allUnits] = await Promise.all([
    findProjectContentBySlug(slug),
    findUnitContentBySlug(slug, unitSlug),
    unitContentRepository.list(),
  ]);

  if (!project || !unit) notFound();

  const otherUnits = allUnits.filter((u) => u.projectSlug === slug && u.id !== unit.id);

  return (
    <>
      <UnitDetailM unit={unit} project={project} otherUnits={otherUnits} />
      <DesktopOnly>
      <UnitHero unit={unit} project={project} />
      <Gallery images={unit.gallery} label="Interior & Exterior" />
      <UnitSpecifications unit={unit} />
      <UnitFloorPlan unit={unit} />
      <UnitDescription unit={unit} />
      <UnitProjectContext project={project} />
      <UnitAvailabilityPrice unit={unit} />
      <UnitEnquiryCTA unit={unit} projectName={project.name} />
      <UnitRelated units={otherUnits} projectSlug={slug} />
      </DesktopOnly>
    </>
  );
}
