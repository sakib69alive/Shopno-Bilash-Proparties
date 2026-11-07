import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { Reveal } from "@/components/ui/Reveal";
import { PROJECT_STATUS_LABEL, type Project } from "@/content/projects";


/**
 * Phone version of the dark "featured development" band — a rounded
 * cinematic card instead of a full-width slab of text. With a real project
 * it is that project's cover photo under a scrim, with its name, location,
 * status and a one-line summary; with none yet it is a dark card with a
 * drawn skyline and an honest "underway" message (nothing invented).
 */
export function FeaturedBandM({ project }: { project?: Project }) {
  return (
    <section className="px-[var(--gutter)] py-6 lg:hidden">
      <Reveal>
        <div
          className={`bg-fg relative flex flex-col justify-end overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white ${project ? "min-h-[28rem]" : "min-h-[35rem]"}`}
        >
          {project ? (
            <>
              <Media
                ratio="auto"
                src={project.coverImage.src}
                alt={project.coverImage.alt}
                sizes="(min-width: 768px) 90vw, 100vw"
                containerClassName="absolute inset-0"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
            </>
          ) : (
            <>
              {/* Drawn, not photographed: a blueprint grid fading out upward, a champagne glow, and a line-art skyline. */}
              <div
                aria-hidden
                className="absolute inset-0 [background-image:linear-gradient(rgb(255_255_255/0.06)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_top,black,transparent_85%)]"
              />
              <div aria-hidden className="absolute -top-16 -right-16 size-64 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_42%,transparent),transparent)]" />
              <svg
                aria-hidden
                viewBox="0 0 360 230"
                className="absolute inset-x-6 top-16 w-[calc(100%-3rem)] text-white/35"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              >
                <defs>
                  <pattern id="fb-windows" width="10" height="12" patternUnits="userSpaceOnUse">
                    <rect x="2" y="3" width="5" height="6" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <line x1="0" y1="224" x2="360" y2="224" />
                <g>
                  <rect x="22" y="130" width="62" height="94" fill="url(#fb-windows)" />
                  <rect x="96" y="70" width="70" height="154" fill="url(#fb-windows)" />
                  <path d="M96 70 L131 48 L166 70" />
                  <rect x="178" y="104" width="56" height="120" fill="url(#fb-windows)" />
                  <rect x="246" y="30" width="78" height="194" fill="url(#fb-windows)" />
                  <line x1="285" y1="30" x2="285" y2="8" />
                  <circle cx="285" cy="6" r="2.5" />
                </g>
                {[0, 1, 2, 3].map((i) => (
                  <line key={i} x1={14 + i * 4} y1="224" x2={14 + i * 4} y2="214" strokeWidth="0.8" />
                ))}
              </svg>
            </>
          )}

          <span className="absolute top-5 left-5 rounded-full bg-white/18 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
            Featured development
          </span>
          {project && (
            <span className="absolute top-5 right-5 rounded-full border border-white/25 bg-black/35 text-white px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
          )}

          <div className="relative">
            <span aria-hidden className="bg-premium mb-4 block h-px w-12" />
            {project ? (
              <>
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-white/75 uppercase">
                  <MapPin aria-hidden className="size-3.5" />
                  {project.location}
                </p>
                <h2 className="font-serif-display mt-2 text-[2.5rem] leading-[1.02] text-balance">{project.name}</h2>
                <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-white/75">
                  {project.shortDescription}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-serif-display text-[2.5rem] leading-[1.02] text-balance">
                  Our next development is underway.
                </h2>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
                  We&rsquo;re planning and building right now — full details will be published here as each development is
                  ready to share.
                </p>
              </>
            )}

            <Link
              href={project ? `/projects/${project.slug}` : "/projects"}
              className="bg-bg text-fg mt-6 flex h-14 items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
            >
              {project ? "Explore this project" : "View all projects"}
              <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
                <ArrowRight aria-hidden className="size-[18px]" />
              </span>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
