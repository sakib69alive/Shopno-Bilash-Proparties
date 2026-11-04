import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DesktopOnly } from "@/components/mobile/DesktopOnly";
import { FeaturedBandM } from "@/components/mobile/FeaturedBandM";
import { buttonVariants } from "@/components/ui/Button";
import type { Project } from "@/content/projects";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import { featuredProject } from "@/content/home";

/**
 * Full-bleed dark visual moment — deliberately echoes the Hero's tone so
 * the page has a recurring rhythm rather than every section looking
 * unrelated. Two states, both driven by `content/home.ts`:
 *  - featuredProject set: an immersive preview card for that one project.
 *  - featuredProject null (today): an honest "in progress" teaser instead
 *    of inventing a project that doesn't exist — swap in real data later
 *    and this section becomes the project preview with no code changes
 *    beyond that data.
 */
export function FeaturedDevelopment({ project }: { project?: Project }) {
  return (
    <>
      <FeaturedBandM project={project} />
      <DesktopOnly>
    <section data-header-tone="dark" className="bg-fg relative overflow-hidden py-24 sm:py-32 lg:py-40">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-[0.06] sm:block"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        {[6, 16, 30, 46, 60, 74, 90].map((x, i) => (
          <rect key={x} x={x} y={100 - (16 + (i % 3) * 12)} width="1.8" height={16 + (i % 3) * 12} fill="white" />
        ))}
      </svg>

      <Container className="relative">
        <Reveal as="p" className="text-label mb-6 text-white/60 uppercase">
          Featured Development
        </Reveal>

        {featuredProject ? (
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
              <Media
                ratio="standard"
                radius="md"
                overlay
                src={featuredProject.image.src}
                alt={featuredProject.image.alt}
              />
              <div>
                <p className="text-caption text-white/50 mb-3 uppercase">
                  {featuredProject.location} · {featuredProject.category}
                </p>
                <h2 className="text-display-m mb-4 text-white">{featuredProject.name}</h2>
                <p className="text-body-lg mb-8 max-w-md text-white/75">
                  {featuredProject.description}
                </p>
                <Link
                  href={featuredProject.href}
                  className={cn(buttonVariants({ size: "lg" }), "gap-2")}
                >
                  Explore Project <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <p className="text-display-m max-w-2xl text-balance text-white">
              Our next development is underway.
            </p>
            <p className="text-body-lg mt-6 max-w-md text-white/75">
              We&rsquo;re planning and building right now — full project details
              will be published here as each development is ready to share.
            </p>
            <Link
              href="/projects"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "mt-10 gap-2 border-white/35 text-white hover:border-white/70 hover:bg-white/10",
              )}
            >
              View All Projects <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Reveal>
        )}
      </Container>
    </section>
      </DesktopOnly>
    </>
  );
}
