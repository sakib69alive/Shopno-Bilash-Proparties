import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SaveButton } from "@/components/saved/SaveButton";
import type { Project } from "@/content/projects";
import type { Unit } from "@/content/units";
import { UnitStatusTag } from "./UnitStatusTag";

/**
 * Text-above-image, not the Project Hero's full-bleed overlay — a
 * deliberately different, quieter hierarchy (per the brief's suggested
 * layout) so a unit page doesn't read as another cinematic hero and
 * doesn't feel like an e-commerce product header either.
 */
export function UnitHero({ unit, project }: { unit: Unit; project: Project }) {
  return (
    <Section spacing="md">
      <Container>
        <Reveal as="p" className="text-label text-fg-subtle mb-4 uppercase">
          <Link href={`/projects/${project.slug}`} className="hover:text-fg transition-colors">
            {project.name}
          </Link>
          {" · "}
          {unit.unitType}
        </Reveal>

        <Reveal delay={80}>
          <h1 className="text-display-xl max-w-4xl text-balance">{unit.name}</h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="text-body-lg text-fg-muted mt-6 max-w-xl">{unit.shortDescription}</p>
        </Reveal>

        <Reveal delay={220} className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="#enquire" className={buttonVariants({ size: "lg" })}>
            Enquire About This Unit
          </Link>
          <SaveButton id={unit.id} name={unit.name} variant="inline" className="h-13" />
          <UnitStatusTag status={unit.status} />
        </Reveal>
      </Container>

      <Reveal delay={280} className="mt-14">
        <Media
          ratio="hero"
          src={unit.coverImage.src}
          alt={unit.coverImage.alt}
          sizes="100vw"
        />
      </Reveal>
    </Section>
  );
}
