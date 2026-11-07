import { compareByOrder } from "@/lib/sortOrder";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { UNIT_STATUS_TONE } from "@/content/units";
import type { PropertyListing } from "@/lib/properties";
import { cn } from "@/lib/utils";

/**
 * Up to two spotlight units — large, image-led, editorial. Omits itself
 * entirely when nothing is actually available, rather than spotlighting a
 * sold-out unit just to fill the section.
 */
export function PropertiesFeatured({ listings }: { listings: PropertyListing[] }) {
  const featured = [...listings]
    .filter((l) => l.status === "available")
    .sort((a, b) => compareByOrder(a.project, b.project) || compareByOrder(a, b) || Number(b.project.featured) - Number(a.project.featured))
    .slice(0, 2);

  if (featured.length === 0) return null;

  return (
    <Section spacing="md">
      <Container>
        <Reveal as="p" className="text-label text-fg-subtle mb-10 uppercase">
          Currently Featured
        </Reveal>

        <div className={cn("grid gap-12", featured.length > 1 && "lg:grid-cols-2 lg:gap-10")}>
          {featured.map((listing, i) => {
            const href = `/projects/${listing.project.slug}/units/${listing.slug}`;
            return (
              <Reveal key={listing.id} delay={i * 100}>
                <Link href={href} className="group block">
                  <Media
                    ratio={featured.length === 1 ? "wide" : "standard"}
                    radius="md"
                    src={listing.coverImage.src}
                    alt={listing.coverImage.alt}
                    className="transition-transform duration-500 ease-[var(--ease-standard)] group-hover:scale-105"
                    sizes={featured.length === 1 ? "100vw" : "(min-width: 1024px) 50vw, 100vw"}
                  />
                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-caption text-fg-subtle uppercase">
                        {listing.project.name} · {listing.project.city}
                      </p>
                      <h3 className="text-display-m group-hover:text-accent mt-1 transition-colors duration-200">
                        {listing.name}
                      </h3>
                    </div>
                    <span className="text-label text-fg-muted inline-flex shrink-0 items-center gap-2 sm:mb-2">
                      <span className={cn("size-1.5 rounded-full", UNIT_STATUS_TONE[listing.status])} aria-hidden />
                      Available Now
                    </span>
                  </div>
                  <p className="text-body-lg text-fg-muted mt-4 max-w-2xl">{listing.shortDescription}</p>
                  <div className="mt-6 flex items-center justify-between gap-6">
                    {listing.price && <p className="text-h4 text-accent">{listing.price}</p>}
                    <span className="text-button text-accent ml-auto inline-flex items-center gap-2">
                      View Details
                      <ArrowRight
                        aria-hidden
                        className="size-4 transition-transform duration-200 ease-[var(--ease-standard)] group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
