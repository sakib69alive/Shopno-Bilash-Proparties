"use client";

import { useState } from "react";
import { Check, ChevronDown, Quote } from "lucide-react";
import { Lightbox } from "@/components/ui/Lightbox";
import { Media } from "@/components/ui/Media";
import { cn } from "@/lib/utils";
import { TEAM_GROUPS, TEAM_GROUP_LABEL, teamGroupOf, type TeamGroup, type TeamMember } from "@/types/teamMember";
import type { FounderProfile } from "@/types/founderProfile";
import { BottomSheet } from "./BottomSheet";
import { Rail } from "./Rail";
import { SectionHeading } from "./SectionHeading";

type Tab = "founder" | TeamGroup;

const GROUP_INTRO: Record<TeamGroup, string> = {
  partner: "The people we build and grow alongside.",
  shareholder: "The shareholders who back the company.",
  employee: "The team behind every project.",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** A round or rectangular monogram used wherever a person has no photo yet. */
function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-accent-soft text-accent font-serif-display flex items-center justify-center",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * The phone Founder page: a portrait hero, then tabs — Founder (story,
 * highlights, statement, vision, principles, photos) plus one tab for each
 * group of people the admin has added under Admin → Website → Team &
 * Partners: Partners, Shareholders and Our team. A tab with nobody in it
 * doesn't appear. Tapping a person opens their card in a bottom sheet. Every
 * section that has no content simply doesn't render.
 */
export function FounderM({ profile, members }: { profile: FounderProfile; members: TeamMember[] }) {
  const [tab, setTab] = useState<Tab>("founder");
  const [open, setOpen] = useState<TeamMember | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const grouped = TEAM_GROUPS.map((g) => ({ group: g, people: members.filter((m) => teamGroupOf(m) === g) })).filter(
    (g) => g.people.length > 0,
  );
  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: "founder", label: "Founder" },
    ...grouped.map((g) => ({ value: g.group as Tab, label: TEAM_GROUP_LABEL[g.group].many, count: g.people.length })),
  ];
  const active = grouped.find((g) => g.group === tab);

  const bioLong = profile.bio.length > 420;

  return (
    <div className="flex flex-col gap-8 pt-3 pb-8 lg:hidden">
      {/* ---------- Portrait hero ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-fg relative flex min-h-[28rem] flex-col justify-end overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
          {profile.photo ? (
            <>
              <Media
                ratio="auto"
                src={profile.photo}
                alt={profile.name}
                sizes="(min-width: 768px) 90vw, 100vw"
                containerClassName="absolute inset-0"
                className="object-top"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            </>
          ) : (
            <>
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,var(--color-accent),transparent_75%)]" />
              <div aria-hidden className="bg-premium/25 absolute -top-16 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl" />
              <span
                aria-hidden
                className="font-serif-display absolute top-16 left-1/2 -translate-x-1/2 text-[7rem] leading-none text-white/20"
              >
                {initials(profile.name)}
              </span>
            </>
          )}
          <span className="absolute top-5 left-5 rounded-full bg-white/18 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
            The person behind the vision
          </span>
          <div className="relative">
            <span aria-hidden className="bg-premium mb-4 block h-px w-12" />
            <h1 className="font-serif-display text-[2.75rem] leading-[1.02] text-balance">{profile.name}</h1>
            <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">{profile.title}</p>
            {profile.intro && <p className="mt-4 text-[1rem] leading-relaxed text-white/80">{profile.intro}</p>}
          </div>
        </div>
      </section>

      {/* ---------- Tabs ---------- */}
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Founder page sections"
          className="no-scrollbar border-border -mt-2 flex gap-7 overflow-x-auto border-b px-[var(--gutter)]"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "relative h-12 shrink-0 text-[0.9375rem] font-semibold whitespace-nowrap transition-colors duration-200",
                tab === t.value ? "text-fg" : "text-fg-subtle",
              )}
            >
              {t.label}
              {t.count !== undefined && <span className="text-fg-subtle ml-1.5 text-xs font-medium tabular-nums">{t.count}</span>}
              <span
                aria-hidden
                className={cn(
                  "bg-accent absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-opacity duration-200",
                  tab === t.value ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* ---------- Founder tab ---------- */}
      {tab === "founder" && (
        <div className="page-enter flex flex-col gap-8">
          {profile.bio && (
            <section className="px-[var(--gutter)]">
              <p className="text-label text-premium uppercase">The journey</p>
              <div className="relative mt-3">
                <p
                  className={cn(
                    "text-[1.0625rem] leading-[1.7] whitespace-pre-line",
                    bioLong && !bioOpen && "line-clamp-[9]",
                  )}
                >
                  {profile.bio}
                </p>
              </div>
              {bioLong && (
                <button
                  type="button"
                  onClick={() => setBioOpen((v) => !v)}
                  aria-expanded={bioOpen}
                  className="text-accent mt-2 flex min-h-11 items-center gap-1 text-sm font-semibold"
                >
                  {bioOpen ? "Show less" : "Read more"}
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-200", bioOpen && "rotate-180")} />
                </button>
              )}
            </section>
          )}

          {profile.highlights.length > 0 && (
            <section className="px-[var(--gutter)]">
              <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
                {profile.highlights.map((h) => (
                  <li key={h} className="flex gap-3 p-4">
                    <span className="bg-accent-soft text-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                      <Check aria-hidden className="size-3.5" />
                    </span>
                    <p className="text-body-sm">{h}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profile.statement && (
            <section className="px-[var(--gutter)]">
              <div className="bg-fg relative overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
                <div aria-hidden className="bg-premium/20 absolute -right-10 -bottom-10 size-52 rounded-full blur-3xl" />
                <Quote aria-hidden className="text-premium relative size-9" />
                <p className="font-serif-display relative mt-4 text-[1.875rem] leading-[1.15] text-balance">{profile.statement}</p>
                <p className="relative mt-5 text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">— {profile.name}</p>
              </div>
            </section>
          )}

          {(profile.vision || profile.mission) && (
            <section className="flex flex-col gap-3 px-[var(--gutter)]">
              {profile.vision && (
                <div className="bg-accent text-accent-foreground rounded-[var(--m-radius-card)] p-5">
                  <p className="text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">Vision</p>
                  <p className="font-serif-display mt-2 text-[1.5rem] leading-[1.2] text-balance">{profile.vision}</p>
                </div>
              )}
              {profile.mission && (
                <div className="bg-surface-raised border-border rounded-[var(--m-radius-card)] border p-5">
                  <p className="text-label text-fg-subtle uppercase">Mission</p>
                  <p className="font-serif-display mt-2 text-[1.5rem] leading-[1.2] text-balance">{profile.mission}</p>
                </div>
              )}
            </section>
          )}

          {profile.philosophy && (
            <section className="px-[var(--gutter)]">
              <p className="text-label text-premium uppercase">Philosophy</p>
              <p className="text-fg-muted mt-3 text-[1.0625rem] leading-[1.7] whitespace-pre-line">{profile.philosophy}</p>
            </section>
          )}

          {profile.principles.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="Principles" />
              <ol className="flex flex-col gap-3 px-[var(--gutter)]">
                {profile.principles.map((p, i) => (
                  <li key={p} className="bg-surface-raised border-border flex items-start gap-4 rounded-[var(--m-radius-card)] border p-4">
                    <span className="font-serif-display text-accent text-[1.75rem] leading-none tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-body-sm pt-0.5">{p}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {profile.gallery.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="In the field" />
              <Rail>
                {profile.gallery.map((img, i) => (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => setLightbox(i)}
                    aria-label={`Open photo ${i + 1}${img.caption ? `: ${img.caption}` : ""}`}
                    className="w-[74vw] max-w-[300px] text-left"
                  >
                    <Media
                      ratio="portrait"
                      src={img.src}
                      alt={img.caption ?? profile.name}
                      sizes="(min-width: 640px) 300px, 74vw"
                      containerClassName="rounded-[var(--m-radius-card)]"
                    />
                    {img.caption && <p className="text-body-sm text-fg-muted mt-2 line-clamp-2">{img.caption}</p>}
                  </button>
                ))}
              </Rail>
            </section>
          )}
        </div>
      )}

      {/* ---------- People tabs ---------- */}
      {active && (
        <section key={active.group} className="page-enter px-[var(--gutter)]">
          <p className="text-fg-muted text-[0.9375rem]">{GROUP_INTRO[active.group]}</p>

          {active.group === "employee" ? (
            <ul className="bg-surface-raised border-border divide-border mt-4 divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
              {active.people.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(m)}
                    className="flex min-h-[4.5rem] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors active:bg-surface"
                  >
                    {m.photo ? (
                      <Media
                        ratio="square"
                        src={m.photo}
                        alt={m.name}
                        sizes="56px"
                        containerClassName="size-14 shrink-0 rounded-full"
                      />
                    ) : (
                      <Monogram name={m.name} className="size-14 shrink-0 rounded-full text-xl" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-display block truncate text-base font-semibold">{m.name}</span>
                      <span className="text-fg-muted block truncate text-sm">{m.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {active.people.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpen(m)}
                  className="group text-left transition-transform active:scale-[0.97]"
                >
                  {m.photo ? (
                    <Media
                      ratio="portrait"
                      src={m.photo}
                      alt={m.name}
                      sizes="(min-width: 640px) 45vw, 46vw"
                      containerClassName="rounded-[var(--m-radius-card)]"
                    />
                  ) : (
                    <Monogram name={m.name} className="aspect-[3/4] w-full rounded-[var(--m-radius-card)] text-5xl" />
                  )}
                  <p className="font-display mt-2.5 text-[0.9375rem] leading-snug font-semibold">{m.name}</p>
                  <p className="text-fg-muted text-xs leading-snug">{m.title}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---------- Person detail sheet ---------- */}
      <BottomSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? TEAM_GROUP_LABEL[teamGroupOf(open)].one : "Profile"}
        className="lg:hidden"
      >
        {open && (
          <div>
            {open.photo ? (
              <Media
                ratio="portrait"
                src={open.photo}
                alt={open.name}
                sizes="(min-width: 640px) 480px, 90vw"
                containerClassName="mx-auto max-h-[22rem] rounded-[var(--m-radius-card)]"
              />
            ) : (
              <Monogram name={open.name} className="mx-auto h-48 w-full rounded-[var(--m-radius-card)] text-7xl" />
            )}
            <span aria-hidden className="bg-premium mt-5 mb-3 block h-px w-12" />
            <p className="font-serif-display text-[2rem] leading-[1.05]">{open.name}</p>
            <p className="text-fg-muted mt-2 text-xs font-semibold tracking-[0.18em] uppercase">{open.title}</p>
            {open.bio && <p className="text-fg-muted mt-4 text-[0.9375rem] leading-relaxed">{open.bio}</p>}
          </div>
        )}
      </BottomSheet>

      <Lightbox
        images={profile.gallery.map((g) => ({ src: g.src, alt: g.caption ?? profile.name, caption: g.caption }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onNavigate={setLightbox}
        label="Founder photos"
      />
    </div>
  );
}
