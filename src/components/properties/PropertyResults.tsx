"use client";

import { compareByOrder } from "@/lib/sortOrder";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { STATUS_PRIORITY, type PropertyListing } from "@/lib/properties";
import { cn } from "@/lib/utils";
import { PropertyCard } from "./PropertyCard";
import { PropertyFilters } from "./PropertyFilters";

function matches(listing: PropertyListing, q: string) {
  if (!q) return true;
  const haystack =
    `${listing.name} ${listing.unitType} ${listing.project.name} ${listing.project.location} ${listing.project.city}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

/**
 * Filters `listings` against the URL's params (also read independently by
 * <PropertyFilters> — both are simply connected to the same URL state, same
 * pattern as <ProjectResults>) and renders the matches in a restrained
 * three-column grid. Default order surfaces available units first without
 * requiring the visitor to filter for them.
 */
export function PropertyResults({ listings }: { listings: PropertyListing[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const project = searchParams.get("project") ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const city = searchParams.get("city") ?? "";
  const beds = searchParams.get("beds") ?? "";

  const filtered = useMemo(
    () =>
      listings.filter(
        (l) =>
          matches(l, q) &&
          (!project || l.project.slug === project) &&
          (!type || l.unitType === type) &&
          (!status || l.status === status) &&
          (!city || l.project.city === city) &&
          (!beds || String(l.bedrooms ?? "") === beds),
      ),
    [listings, q, project, type, status, city, beds],
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        // The admin's own order wins (projects first, then that project's properties); unordered items fall through to the rules below.
        const byAdmin = compareByOrder(a.project, b.project) || compareByOrder(a, b);
        if (byAdmin !== 0) return byAdmin;
        const byStatus = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
        if (byStatus !== 0) return byStatus;
        const byFeatured = Number(b.project.featured) - Number(a.project.featured);
        if (byFeatured !== 0) return byFeatured;
        return a.name.localeCompare(b.name);
      }),
    [filtered],
  );

  // Fade the result set on change, without a layout jump or a flash of
  // empty content — same technique as <ProjectResults>.
  const [visible, setVisible] = useState(true);
  const resultsKey = sorted.map((l) => l.id).join(",");
  const previousKey = useRef(resultsKey);
  useEffect(() => {
    if (previousKey.current === resultsKey) return;
    previousKey.current = resultsKey;
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [resultsKey]);

  return (
    <>
      <Section spacing="sm">
        <Container>
          <PropertyFilters listings={listings} resultCount={sorted.length} />
        </Container>
      </Section>

      <div aria-live="polite" className="sr-only">
        {`${sorted.length} ${sorted.length === 1 ? "property" : "properties"} found`}
      </div>

      <div className={cn("transition-opacity duration-200 ease-[var(--ease-standard)]", visible ? "opacity-100" : "opacity-0")}>
        {sorted.length === 0 ? (
          <Section spacing="lg">
            <Container size="narrow" className="text-center">
              <p className="text-h2 text-balance">No properties match these filters.</p>
              <p className="text-body text-fg-muted mt-4">
                Try a different search term, or clear your filters to see every available property.
              </p>
              <button
                type="button"
                onClick={() => router.replace(pathname, { scroll: false })}
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8")}
              >
                Clear Filters
              </button>
            </Container>
          </Section>
        ) : (
          <Section spacing="lg" background="surface">
            <Container>
              <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((listing, i) => (
                  <Reveal key={listing.id} delay={(i % 6) * 60}>
                    <PropertyCard listing={listing} index={i} />
                  </Reveal>
                ))}
              </div>
            </Container>
          </Section>
        )}
      </div>
    </>
  );
}
