"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Hammer, MapPin } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import type { ConstructionMilestone, ConstructionProgress } from "@/content/construction";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";
import { cn } from "@/lib/utils";
import { ProjectCardM } from "./ProjectCardM";
import { Rail } from "./Rail";
import { SectionHeading } from "./SectionHeading";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** A circular progress gauge — a thin track, a green arc, the percentage in the middle. */
function ProgressRing({ value, size = 72, light = false }: { value: number; size?: number; light?: boolean }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={light ? "stroke-white/25" : "stroke-border"} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)}
          className={light ? "stroke-white" : "stroke-accent"}
        />
      </svg>
      <span
        className={cn(
          "font-display absolute inset-0 flex items-center justify-center text-[0.9375rem] font-bold tabular-nums",
          light ? "text-white" : "text-fg",
        )}
      >
        {value}%
      </span>
    </div>
  );
}

const STATUS_LABEL: Record<ConstructionMilestone["status"], string> = {
  completed: "Completed",
  "in-progress": "In progress",
  upcoming: "Upcoming",
};

/* ------------------------------------------------------------------ */
/* Overview (/construction)                                            */
/* ------------------------------------------------------------------ */

interface TrackedProject {
  project: Project;
  progress: ConstructionProgress;
}

/**
 * Phone Construction overview: a serif opening, then one card per project
 * that has published construction updates — photo, a progress ring, the
 * current phase, last-updated date. A project with no published updates is
 * never shown here. While there are none, the page says so honestly and
 * offers the projects that are under construction (from their status) and a
 * way to ask.
 */
export function ConstructionOverviewM({ items, underway }: { items: TrackedProject[]; underway: Project[] }) {
  return (
    <div className="flex flex-col gap-8 pt-6 pb-8 lg:hidden">
      <section className="px-[var(--gutter)]">
        <p className="hero-in text-label text-fg-subtle uppercase" style={{ animationDelay: "0ms" }}>
          Construction
        </p>
        <h1 className="font-serif-display hero-in mt-3 text-[2.75rem] leading-[1.02] text-balance" style={{ animationDelay: "100ms" }}>
          Real progress, not renderings.
        </h1>
        <span aria-hidden className="bg-premium hero-in mt-6 block h-px w-12" />
        <p className="hero-in text-fg-muted mt-5 text-[1.0625rem] leading-relaxed" style={{ animationDelay: "220ms" }}>
          Every active development, tracked stage by stage — the same updates buyers and landowners see, published openly.
        </p>
      </section>

      {items.length > 0 ? (
        <section className="flex flex-col gap-4 px-[var(--gutter)]">
          {items.map(({ project, progress }, i) => (
            <Reveal key={project.slug} delay={Math.min(i, 3) * 60}>
              <Link
                href={`/projects/${project.slug}/construction`}
                className="bg-surface-raised border-border block overflow-hidden rounded-[var(--m-radius-hero)] border shadow-sm transition-transform duration-150 active:scale-[0.985]"
              >
                <Media
                  ratio="auto"
                  src={project.coverImage.src}
                  alt={project.coverImage.alt}
                  sizes="(min-width: 768px) 90vw, 100vw"
                  containerClassName="aspect-[16/10]"
                />
                <div className="flex items-center gap-4 p-4">
                  {progress.overallProgress !== undefined && <ProgressRing value={progress.overallProgress} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-fg-subtle uppercase">{progress.currentPhase ?? "In progress"}</p>
                    <h2 className="font-display mt-0.5 text-lg leading-tight font-semibold">{project.name}</h2>
                    <p className="text-body-sm text-fg-muted mt-1 flex items-center gap-1.5">
                      <MapPin aria-hidden className="text-fg-subtle size-3.5 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </p>
                    {progress.lastUpdated && <p className="text-caption text-fg-subtle mt-1">Updated {progress.lastUpdated}</p>}
                  </div>
                  <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
                    <ArrowRight aria-hidden className="size-[18px]" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </section>
      ) : (
        <>
          <section className="px-[var(--gutter)]">
            <div className="bg-fg relative overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
              <div aria-hidden className="absolute -top-12 -right-12 size-52 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_35%,transparent),transparent)]" />
              <span className="bg-white/15 relative flex size-12 items-center justify-center rounded-full">
                <Hammer aria-hidden className="size-5" />
              </span>
              <span aria-hidden className="bg-premium relative mt-5 mb-5 block h-px w-12" />
              <p className="font-serif-display relative text-[1.875rem] leading-[1.1] text-balance">
                Construction updates are being prepared for publication.
              </p>
              <p className="relative mt-3 text-[0.9375rem] leading-relaxed text-white/70">
                Check back soon, or ask about a specific project&rsquo;s progress.
              </p>
              <Link
                href="/contact?type=construction"
                className="bg-bg text-fg relative mt-6 flex h-14 items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
              >
                Ask about a project
                <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
                  <ArrowRight aria-hidden className="size-[18px]" />
                </span>
              </Link>
            </div>
          </section>

          {underway.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="Under construction now" description="Projects currently being built" href="/projects" />
              <Rail>
                {underway.map((project) => (
                  <ProjectCardM key={project.id} project={project} layout="rail" />
                ))}
              </Rail>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-project (/projects/[slug]/construction)                          */
/* ------------------------------------------------------------------ */

function BeforeAfter({ label, before, current }: { label: string; before: { src: string; alt: string }; current: { src: string; alt: string } }) {
  const [value, setValue] = useState(50);
  const id = useId();
  return (
    <div>
      <p className="text-label text-fg-subtle mb-3 uppercase">{label}</p>
      <div className="bg-surface relative aspect-[4/3] w-full overflow-hidden rounded-[var(--m-radius-card)]">
        <Media ratio="auto" src={before.src} alt={before.alt} sizes="100vw" containerClassName="absolute inset-0" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}>
          <Media ratio="auto" src={current.src} alt={current.alt} sizes="100vw" containerClassName="absolute inset-0" />
        </div>
        <div aria-hidden className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${value}%` }} />
        <span aria-hidden className="absolute top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-xs font-bold text-black shadow-md" style={{ left: `${value}%` }}>
          ⇆
        </span>
        <span className="absolute top-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">Before</span>
        <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white">Current</span>
        <label htmlFor={id} className="sr-only">
          {label} — drag to compare before and current
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  );
}

/** Fills the progress bar once on mount, so it grows into place rather than just appearing. */
function ProgressBar({ value }: { value: number }) {
  const [filled, setFilled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div ref={ref} className="bg-border mt-4 h-2 w-full overflow-hidden rounded-full">
      <div
        className="bg-accent h-full rounded-full transition-[width] duration-[1200ms] ease-[var(--ease-standard)]"
        style={{ width: filled ? `${value}%` : "0%" }}
      />
    </div>
  );
}

/**
 * Phone construction page for one project: a photo header with the progress
 * ring, a progress card, the milestone timeline, the progress journal as a
 * swipe rail, before/after sliders, what's coming up, and a closing card.
 * Only data that exists is shown — no percentage, update or image pair is
 * ever filled in.
 */
export function ConstructionDetailM({ project, progress, hasUnits }: { project: Project; progress: ConstructionProgress; hasUnits: boolean }) {
  const latest = progress.updates[progress.updates.length - 1];
  const upcoming = progress.milestones.filter((m) => m.status === "upcoming");
  const pairs = progress.beforeAfter ?? [];

  return (
    <div className="flex flex-col gap-10 pt-3 pb-8 lg:hidden">
      {/* ---------- Header ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-fg relative flex min-h-[24rem] flex-col justify-end overflow-hidden rounded-[var(--m-radius-hero)] p-5 text-white">
          <Media ratio="auto" src={project.coverImage.src} alt={project.coverImage.alt} sizes="(min-width: 768px) 90vw, 100vw" containerClassName="absolute inset-0" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          <span className="absolute top-4 left-4 rounded-full bg-white/20 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
            Construction progress
          </span>
          {progress.overallProgress !== undefined && (
            <div className="absolute top-3 right-3">
              <ProgressRing value={progress.overallProgress} size={64} light />
            </div>
          )}
          <div className="relative">
            <span aria-hidden className="bg-premium mb-4 block h-px w-12" />
            <h1 className="font-serif-display text-[2.5rem] leading-[1.02] text-balance">{project.name}</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/75">
              {progress.introduction ?? `${project.location} · ${PROJECT_STATUS_LABEL[project.status]}`}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Progress card ---------- */}
      {progress.overallProgress !== undefined && (
        <Reveal as="section" className="px-[var(--gutter)]">
          <div className="bg-surface-raised border-border rounded-[var(--m-radius-hero)] border p-5 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-label text-fg-subtle uppercase">Overall progress</p>
                <p className="font-serif-display text-accent mt-1 text-[3.5rem] leading-none tabular-nums">{progress.overallProgress}%</p>
              </div>
              {progress.currentPhase && (
                <div className="text-right">
                  <p className="text-caption text-fg-subtle">Current phase</p>
                  <p className="bg-accent-soft text-accent mt-1 rounded-full px-3 py-1.5 text-sm font-semibold">{progress.currentPhase}</p>
                </div>
              )}
            </div>
            <ProgressBar value={progress.overallProgress} />
            {progress.lastUpdated && <p className="text-caption text-fg-subtle mt-3">Last updated {progress.lastUpdated}</p>}
          </div>
        </Reveal>
      )}

      {/* ---------- Timeline ---------- */}
      {progress.milestones.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeading title="Construction timeline" />
          <ol className="flex flex-col px-[var(--gutter)]">
            {progress.milestones.map((m, i) => {
              const done = m.status === "completed";
              const active = m.status === "in-progress";
              return (
                <li key={m.title} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < progress.milestones.length - 1 && <span aria-hidden className="bg-border absolute top-9 bottom-0 left-[1.125rem] w-px" />}
                  <span
                    className={cn(
                      "relative flex size-9 shrink-0 items-center justify-center rounded-full border-2",
                      done && "bg-accent border-accent text-accent-foreground",
                      active && "bg-accent-soft border-accent text-accent",
                      !done && !active && "bg-bg border-border-strong text-fg-subtle",
                    )}
                  >
                    {done ? <Check aria-hidden className="size-4" /> : <span className="text-xs font-bold tabular-nums">{i + 1}</span>}
                  </span>
                  <div className="bg-surface-raised border-border flex-1 rounded-[var(--m-radius-card)] border p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-display text-base font-semibold">{m.title}</p>
                      <span className={cn("text-[11px] font-semibold tracking-wide uppercase", done || active ? "text-accent" : "text-fg-subtle")}>
                        {STATUS_LABEL[m.status]}
                      </span>
                    </div>
                    {m.date && <p className="text-caption text-fg-subtle mt-0.5">{m.date}</p>}
                    {m.description && <p className="text-body-sm text-fg-muted mt-2">{m.description}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ---------- Journal ---------- */}
      {progress.updates.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionHeading title="Progress journal" description="Photo updates from the site" />
          <Rail>
            {[...progress.updates].reverse().map((u) => (
              <article
                key={`${u.date}-${u.title}`}
                className="bg-surface-raised border-border w-[82vw] max-w-[340px] overflow-hidden rounded-[var(--m-radius-card)] border"
              >
                {u.images[0] && (
                  <Media ratio="standard" src={u.images[0].src} alt={u.images[0].alt} sizes="(min-width: 640px) 340px, 82vw" />
                )}
                <div className="p-4">
                  <p className="text-caption text-fg-subtle uppercase">
                    {u.date} · {u.phase}
                  </p>
                  <h3 className="font-display mt-1 text-base leading-snug font-semibold">{u.title}</h3>
                  <p className="text-body-sm text-fg-muted mt-2 line-clamp-4">{u.description}</p>
                  {u.progress !== undefined && <p className="text-accent mt-3 text-sm font-semibold tabular-nums">{u.progress}% complete</p>}
                </div>
              </article>
            ))}
          </Rail>
        </section>
      )}

      {/* ---------- Before / current ---------- */}
      {pairs.length > 0 && (
        <section className="flex flex-col gap-4 px-[var(--gutter)]">
          <p className="font-display text-[1.25rem] leading-tight font-semibold tracking-tight">Before &amp; current</p>
          {pairs.map((pair) => (
            <BeforeAfter key={pair.label} label={pair.label} before={pair.before} current={pair.current} />
          ))}
        </section>
      )}

      {/* ---------- Currently / coming up ---------- */}
      {(latest || upcoming.length > 0) && (
        <section className="flex flex-col gap-4 px-[var(--gutter)]">
          {latest && (
            <div className="bg-accent text-accent-foreground relative overflow-hidden rounded-[var(--m-radius-hero)] p-5">
              <div aria-hidden className="absolute -top-10 -right-10 size-44 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_35%,transparent),transparent)]" />
              <p className="relative text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">Currently</p>
              <p className="font-serif-display relative mt-2 text-[1.875rem] leading-[1.1] text-balance">{latest.phase}</p>
              <p className="relative mt-2 text-[0.9375rem] leading-relaxed text-white/75">{latest.description}</p>
              <p className="relative mt-3 text-xs text-white/55">{latest.date}</p>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="bg-surface-raised border-border rounded-[var(--m-radius-card)] border p-5">
              <p className="text-label text-fg-subtle uppercase">Coming up</p>
              <ul className="mt-3 flex flex-col gap-4">
                {upcoming.map((m) => (
                  <li key={m.title} className="border-border border-t pt-4 first:border-0 first:pt-0">
                    <p className="font-display text-base font-semibold">{m.title}</p>
                    {m.description && <p className="text-body-sm text-fg-muted mt-1">{m.description}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ---------- Closing ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-fg relative overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
          <div aria-hidden className="absolute -right-10 -bottom-10 size-52 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_28%,transparent),transparent)]" />
          <span aria-hidden className="bg-premium relative mb-5 block h-px w-12" />
          <p className="relative text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">{project.name}</p>
          <p className="font-serif-display relative mt-3 text-[2rem] leading-[1.08] text-balance">Watch this project take shape.</p>
          <div className="relative mt-6 flex flex-col gap-2.5">
            <Link
              href={`/projects/${project.slug}`}
              className="bg-bg text-fg flex h-14 items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
            >
              View the project
              <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
                <ArrowRight aria-hidden className="size-[18px]" />
              </span>
            </Link>
            {hasUnits && (
              <Link
                href={`/properties?project=${encodeURIComponent(project.slug)}`}
                className="flex h-12 items-center justify-center rounded-full border border-white/30 text-sm font-semibold transition-transform active:scale-[0.98]"
              >
                Browse available homes
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
