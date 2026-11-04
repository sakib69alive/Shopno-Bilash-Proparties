"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, ChevronDown, MapPin } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type Project, type ProjectStatus } from "@/content/projects";
import type { Unit } from "@/content/units";
import { getProjectAvailability } from "@/lib/projectAvailability";
import { cn } from "@/lib/utils";
import { EmptyCard } from "./EmptyCard";

const STATUS_ORDER: ProjectStatus[] = ["ongoing", "near-completion", "upcoming", "planning", "completed", "sold-out"];

function ShowcaseCard({ project, units, priority }: { project: Project; units: Unit[]; priority: boolean }) {
  const { available } = getProjectAvailability(project, units);
  const facts = [
    available ? `${available} available` : null,
    project.floors ? `${project.floors} floors` : null,
    project.completionYear ? `Completion ${project.completionYear}` : null,
  ].filter((f): f is string => f !== null);

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--m-radius-hero)] transition-transform duration-150 active:scale-[0.985]"
    >
      <Media
        ratio="auto"
        src={project.coverImage.src}
        alt={project.coverImage.alt}
        sizes="(min-width: 768px) 50vw, 100vw"
        priority={priority}
        containerClassName="absolute inset-0"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10"
      />

      <div className="absolute inset-x-4 top-4 flex items-start justify-between">
        <div className="flex flex-wrap gap-1.5">
          <span className="bg-bg text-fg inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
            <span className={cn("size-1.5 rounded-full", PROJECT_STATUS_TONE[project.status])} aria-hidden />
            {PROJECT_STATUS_LABEL[project.status]}
          </span>
          {project.featured && (
            <span className="bg-accent text-accent-foreground rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
              Featured
            </span>
          )}
        </div>
        <span
          aria-hidden
          className="bg-bg text-fg flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-active:rotate-12"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>

      <div className="absolute inset-x-5 bottom-5 text-white">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-white/75 uppercase">
          <MapPin aria-hidden className="size-3.5" />
          {project.location}
        </p>
        <h2 className="font-serif-display mt-1.5 text-[2.125rem] leading-[1.05] text-balance">{project.name}</h2>
        {facts.length > 0 && (
          <ul className="mt-3.5 flex flex-wrap gap-1.5">
            {facts.map((fact) => (
              <li key={fact} className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium">
                {fact}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}

/**
 * Phone Projects page: a serif title with a real count line, status and
 * city filters as pill rails (only values that exist in the data), then one
 * tall photo card per development. Everything shown — status, location,
 * units available, floors, completion year — comes from the project record;
 * a fact that isn't set simply doesn't appear.
 */
export function ProjectsM({ projects, units }: { projects: Project[]; units: Unit[] }) {
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");

  const statuses = STATUS_ORDER.filter((s) => projects.some((p) => p.status === s));
  const cities = Array.from(new Set(projects.map((p) => p.city))).sort();

  const visible = projects.filter(
    (p) => (status === "all" || p.status === status) && (city === "all" || p.city === city),
  );

  const cityCount = cities.length;
  const countLine = `${projects.length} ${projects.length === 1 ? "development" : "developments"}${
    cityCount > 1 ? ` across ${cityCount} cities` : cityCount === 1 ? ` in ${cities[0]}` : ""
  }`;

  return (
    <div className="pb-6 lg:hidden">
      <div className="px-[var(--gutter)] pt-6">
        <p className="text-label text-fg-subtle uppercase">Our projects</p>
        <h1 className="font-serif-display mt-2 text-[2.5rem] leading-[1.05] text-balance">
          Every development starts with land.
        </h1>
        {projects.length > 0 && (
          <p className="text-fg-muted mt-3 flex items-center gap-2 text-sm">
            <Building2 aria-hidden className="text-fg-subtle size-4" />
            {countLine}
          </p>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="px-[var(--gutter)] pt-8">
          <EmptyCard
            icon={Building2}
            title="Projects are coming soon"
            description="We're preparing our first developments for the site. Get in touch to hear about them early."
            action={{ label: "Talk to us", href: "/contact?type=project" }}
          />
        </div>
      ) : (
        <>
          {(statuses.length > 1 || cities.length > 1) && (
            <div className="mt-5">
              {statuses.length > 1 && (
                <div
                  role="tablist"
                  aria-label="Project status"
                  className="no-scrollbar border-border flex gap-6 overflow-x-auto border-b px-[var(--gutter)]"
                >
                  {[
                    { value: "all", label: "All", count: projects.length },
                    ...statuses.map((st) => ({
                      value: st,
                      label: PROJECT_STATUS_LABEL[st],
                      count: projects.filter((p) => p.status === st).length,
                    })),
                  ].map((tab) => {
                    const active = tab.value === status;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setStatus(tab.value)}
                        className={cn(
                          "relative h-12 shrink-0 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-200",
                          active ? "text-fg" : "text-fg-subtle",
                        )}
                      >
                        {tab.label}
                        <span className="text-fg-subtle ml-1.5 text-xs font-medium tabular-nums">{tab.count}</span>
                        <span
                          aria-hidden
                          className={cn(
                            "bg-accent absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-opacity duration-200",
                            active ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              {cities.length > 1 && (
                <div className="relative mt-3 flex px-[var(--gutter)]">
                  <span className="bg-surface-raised border-border text-fg pointer-events-none inline-flex h-10 items-center gap-2 rounded-full border pr-3 pl-4 text-sm font-semibold">
                    <MapPin aria-hidden className="text-fg-subtle size-4" />
                    {city === "all" ? "All cities" : city}
                    <ChevronDown aria-hidden className="text-fg-subtle size-4" />
                  </span>
                  <select
                    aria-label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="absolute inset-y-0 left-[var(--gutter)] w-44 cursor-pointer opacity-0"
                  >
                    <option value="all">All cities</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 px-[var(--gutter)]">
            {visible.length === 0 ? (
              <EmptyCard
                title="No projects match"
                description="Try a different status or city."
              />
            ) : (
              visible.map((project, i) => (
                <Reveal key={project.id} delay={Math.min(i, 3) * 60}>
                  <ShowcaseCard project={project} units={units} priority={false} />
                </Reveal>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
