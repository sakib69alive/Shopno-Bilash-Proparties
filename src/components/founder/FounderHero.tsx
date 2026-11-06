"use client";

import { usePageHeaderVariant } from "@/components/navigation/HeaderVariantContext";
import { Media } from "@/components/ui/Media";
import type { FounderProfile } from "@/types/founderProfile";

export interface FounderHeroProps {
  profile: FounderProfile;
}

/**
 * The Founder page's opening moment — an editorial split, not a photo-as-
 * background panel: the portrait is a genuine hero element in its own
 * right (large, mask-revealed), sitting beside the name rather than
 * behind it. Warm ivory/stone/charcoal palette — this page deliberately
 * does NOT use the site's green accent as its dominant color, reserving
 * it for interactive controls elsewhere. Photo-first in the DOM (mobile
 * shows the portrait before the text, per brief) with
 * `lg:flex-row-reverse` swapping the visual order on desktop (text left,
 * portrait right) without duplicating markup.
 *
 * Overlay header, like every other hero on the site — floats fully
 * transparent over this section rather than sitting on its own solid/
 * glass bar. Because this hero is mostly light (unlike the dark heroes
 * elsewhere), a short dark scrim across just the top keeps the header's
 * white nav legible without darkening the rest of the composition.
 */
export function FounderHero({ profile }: FounderHeroProps) {
  usePageHeaderVariant("overlay");

  return (
    <section className="bg-bg relative overflow-hidden lg:flex lg:min-h-[100svh] lg:flex-row-reverse">
      <div
        aria-hidden
        data-header-tone="dark"
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-black/55 to-transparent lg:h-36"
      />

      <div className="relative h-[62svh] w-full overflow-hidden lg:h-auto lg:w-[54%]">
        <div className="hero-image-in absolute inset-0" style={{ animationDelay: "80ms" }}>
          {profile.photo ? (
            <Media
              ratio="auto"
              src={profile.photo}
              alt={profile.name}
              sizes="(min-width: 1024px) 54vw, 100vw"
              containerClassName="h-full"
              className="object-top"
            />
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(155deg,var(--color-surface),var(--color-bg)_55%,var(--color-premium-soft)_130%)]">
              <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.35]" preserveAspectRatio="none" viewBox="0 0 100 100">
                {[14, 30, 46, 62, 78].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="var(--color-border-strong)" strokeWidth="0.15" />
                ))}
                {[20, 42, 64, 86].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--color-border-strong)" strokeWidth="0.15" />
                ))}
              </svg>
              <div className="border-premium/50 absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border" />
            </div>
          )}
        </div>
        <div aria-hidden className="from-bg pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r to-transparent lg:block" />
      </div>

      <div className="relative z-10 flex flex-col justify-center gap-1 px-[var(--gutter)] py-14 sm:py-16 lg:w-[46%] lg:px-16 lg:py-24 xl:px-20">
        <p className="hero-in text-label text-premium mb-5 uppercase" style={{ animationDelay: "0ms" }}>
          The Person Behind The Vision
        </p>

        <h1 className="hero-in text-display-xl text-fg text-balance" style={{ animationDelay: "120ms" }}>
          {profile.name}
        </h1>

        <div className="hero-in mt-5 flex items-center gap-3" style={{ animationDelay: "220ms" }}>
          <span aria-hidden className="bg-premium h-px w-8" />
          <p className="text-label text-fg-muted uppercase">{profile.title}</p>
        </div>

        {profile.intro && (
          <p className="hero-in text-body-lg text-fg-muted mt-8 max-w-md" style={{ animationDelay: "340ms" }}>
            {profile.intro}
          </p>
        )}
      </div>
    </section>
  );
}
