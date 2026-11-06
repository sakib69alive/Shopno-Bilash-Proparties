import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { SkylineBars } from "@/components/ui/SkylineBars";
import { cn } from "@/lib/utils";
import type { Project } from "@/content/projects";

/** The closing beat of the case study — named after the project, not a generic contact box. */
export function ProjectEnquiryCTA({ project, hasUnits = true }: { project: Project; hasUnits?: boolean }) {
  return (
    <section data-header-tone="dark" className="bg-fg relative overflow-hidden max-lg:mx-3 max-lg:rounded-[var(--m-radius-hero)] py-24 text-center sm:py-32 lg:py-40">
      <SkylineBars className="pointer-events-none absolute inset-0 hidden h-full w-full text-white/10 sm:block" />
      <Container className="relative">
        <Reveal as="p" className="text-label mb-6 text-white/60 uppercase">
          Interested?
        </Reveal>
        <Reveal delay={80}>
          <p className="text-display-l mx-auto max-w-3xl text-balance text-white">
            Let&rsquo;s talk about {project.name}.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={`/contact?project=${encodeURIComponent(project.name)}&type=project`}
              className={buttonVariants({ size: "lg" })}
            >
              Request Information
            </Link>
            {hasUnits && (
              <Link
                href={`/properties?project=${encodeURIComponent(project.slug)}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/35 text-white hover:border-white/70 hover:bg-white/10",
                )}
              >
                Explore Available Units
              </Link>
            )}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
