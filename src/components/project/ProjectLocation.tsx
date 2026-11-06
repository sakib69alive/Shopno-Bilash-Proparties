import { Container } from "@/components/ui/Container";
import { LocationMap } from "@/components/ui/LocationMap";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/content/projects";

/**
 * Shows the project's Google Map when its `mapUrl` is set (see `lib/mapLinks.ts`),
 * otherwise a clean placeholder. Nearby places only render if the project
 * actually lists them (never invented distances, per the brief).
 */
export function ProjectLocation({ project }: { project: Project }) {
  return (
    <Section spacing="lg" background="surface">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          <div>
            <Reveal as="p" className="text-label text-fg-subtle mb-6 uppercase">
              Location
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-h1">{project.location}</h2>
            </Reveal>
            {project.locationDescription && (
              <Reveal delay={140}>
                <p className="text-body text-fg-muted mt-5 max-w-md">
                  {project.locationDescription}
                </p>
              </Reveal>
            )}

            {project.nearbyPlaces && project.nearbyPlaces.length > 0 && (
              <Reveal delay={200} className="mt-8 flex flex-col gap-3">
                {project.nearbyPlaces.map((place) => (
                  <div
                    key={place.label}
                    className="text-body-sm text-fg-muted flex items-center justify-between border-b border-border pb-3"
                  >
                    <span>{place.label}</span>
                    {place.distance && <span className="text-fg-subtle">{place.distance}</span>}
                  </div>
                ))}
              </Reveal>
            )}
          </div>

          {/* Real map when the project has a map link (Admin → Website → Projects), else the placeholder. */}
          <Reveal delay={120}>
            <LocationMap mapUrl={project.mapUrl} label={project.location} />
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
