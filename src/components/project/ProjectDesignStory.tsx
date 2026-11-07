import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/content/projects";

/**
 * Large image + a refined feature list — not an icon grid. Omits itself
 * entirely (rather than rendering an empty shell) when the project has
 * neither a secondary image nor any feature data.
 */
export function ProjectDesignStory({ project }: { project: Project }) {
  const image = project.gallery[0] ?? null;
  const features = project.features ?? [];
  if (!image && features.length === 0) return null;

  return (
    // Phones get a tight rhythm (the 160px desktop padding left a big empty band under the blueprints); desktop keeps the large one.
    <Section
      spacing="lg"
      className="[--design-pad:2rem] lg:[--design-pad:var(--space-section-lg)]"
      style={{ paddingTop: "var(--design-pad)", paddingBottom: "var(--design-pad)" }}
    >
      <Container>
        <Reveal as="p" className="text-label text-fg-subtle mb-10 uppercase">
          The Design
        </Reveal>

        {image && (
          <Reveal className="mb-12">
            <Media
              ratio="wide"
              radius="md"
              src={image.src}
              alt={image.alt}
              sizes="100vw"
            />
          </Reveal>
        )}

        {features.length > 0 && (
          <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Reveal key={feature} delay={i * 40} className="border-border border-t pt-4">
                <p className="text-body">{feature}</p>
              </Reveal>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
