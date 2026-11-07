"use client";

import { compareByOrder } from "@/lib/sortOrder";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./ProjectCard";
import { ProjectFilters } from "./ProjectFilters";

const LIST_VARIANTS = ["editorial", "horizontal", "minimal"] as const;

function matches(project: Project, q: string) {
  if (!q) return true;
  const haystack = `${project.name} ${project.location} ${project.city} ${project.projectType}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

/**
 * Filters `projects` against the URL's `q`/`type`/`status`/`city` params
 * (also read independently by <ProjectFilters>, no prop-drilling needed —
 * both components are simply "connected" to the same URL state) and
 * renders the matches with the Step 7 variant system. A brief cross-fade
 * on the results container is the only transition — brief §17 explicitly
 * warns against flashing/aggressive animation here.
 */
export function ProjectResults({ projects }: { projects: Project[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "";
  const status = searchParams.get("status") ?? "";
  const city = searchParams.get("city") ?? "";

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          matches(p, q) &&
          (!type || p.projectType === type) &&
          (!status || p.status === status) &&
          (!city || p.city === city),
      ),
    [projects, q, type, status, city],
  );

  const sorted = useMemo(() => [...filtered].sort((a, b) => compareByOrder(a, b) || Number(b.featured) - Number(a.featured)), [filtered]);
  const [first, ...rest] = sorted;
  const showFeaturedHero = Boolean(first?.featured);

  // Fade the result set on change, without a layout jump or a flash of
  // empty content — a plain CSS opacity transition keyed to the filtered
  // list's identity.
  const [visible, setVisible] = useState(true);
  const resultsKey = sorted.map((p) => p.id).join(",");
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
          <ProjectFilters projects={projects} resultCount={sorted.length} />
        </Container>
      </Section>

      <div
        aria-live="polite"
        className="sr-only"
      >{`${sorted.length} ${sorted.length === 1 ? "development" : "developments"} found`}</div>

      <div className={cn("transition-opacity duration-200 ease-[var(--ease-standard)]", visible ? "opacity-100" : "opacity-0")}>
        {sorted.length === 0 ? (
          <Section spacing="lg">
            <Container size="narrow" className="text-center">
              <p className="text-h2 text-balance">No developments match these filters.</p>
              <p className="text-body text-fg-muted mt-4">
                Try a different search term, or clear your filters to see everything we&rsquo;re building.
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
          <>
            {showFeaturedHero && (
              <Section spacing="md">
                <Container>
                  <ProjectCard project={first} variant="featured" />
                </Container>
              </Section>
            )}

            {(showFeaturedHero ? rest : sorted).length > 0 && (
              <Section spacing="lg" background="surface">
                <Container className="flex flex-col gap-20 lg:gap-28">
                  {(showFeaturedHero ? rest : sorted).map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      variant={LIST_VARIANTS[i % LIST_VARIANTS.length]}
                      index={i}
                      imagePosition={i % 2 === 0 ? "left" : "right"}
                    />
                  ))}
                </Container>
              </Section>
            )}
          </>
        )}
      </div>
    </>
  );
}
