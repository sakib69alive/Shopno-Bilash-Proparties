import Link from "next/link";
import { ArrowRight, Eye, Gem, Hourglass, ShieldCheck, UserCheck, type LucideIcon } from "lucide-react";
import { MilestoneEntry } from "@/components/about/MilestoneEntry";
import { Reveal } from "@/components/ui/Reveal";
import { closing, expertise, intro, process, storyFallback, values, vision } from "@/content/about";
import type { Statistic } from "@/content/home";
import { services } from "@/content/services";
import type { CompanyMilestone } from "@/types/companyMilestone";
import { Accordion } from "./Accordion";
import { SectionHeading } from "./SectionHeading";
import { StepRail } from "./StepRail";

const VALUE_ICONS: Record<string, LucideIcon> = {
  Integrity: ShieldCheck,
  Transparency: Eye,
  Quality: Gem,
  "Long-Term Thinking": Hourglass,
  Accountability: UserCheck,
};

/** A champagne hairline — the small accent used to open each dark card on the phone pages. */
function Rule({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`bg-premium block h-px w-12 ${className}`} />;
}

/**
 * The phone About page: a large serif opening, the story as a timeline card
 * (or an honest paragraph while no milestones exist), the vision on a dark
 * card, the four-step process as a swipe rail, values, expertise folded into
 * an accordion, the six ways to work with us as link tiles, then real impact
 * numbers (only the ones that are set) and a closing card. The team section
 * stays out until real people are added — nothing here is invented.
 */
export function AboutM({ milestones, stats }: { milestones: CompanyMilestone[]; stats: Statistic[] }) {
  const impact = stats.filter((s): s is Statistic & { value: number } => s.value !== null);

  return (
    <div className="flex flex-col gap-10 pt-6 pb-8 lg:hidden">
      {/* ---------- Opening ---------- */}
      <section className="px-[var(--gutter)]">
        <p className="hero-in text-label text-fg-subtle uppercase" style={{ animationDelay: "0ms" }}>
          {intro.eyebrow}
        </p>
        <h1 className="font-serif-display hero-in mt-3 text-[2.75rem] leading-[1.02] text-balance" style={{ animationDelay: "100ms" }}>
          {intro.statement}
        </h1>
        <Rule className="hero-in mt-6" />
        <p className="hero-in text-fg-muted mt-5 text-[1.0625rem] leading-relaxed" style={{ animationDelay: "220ms" }}>
          {intro.supporting}
        </p>
      </section>

      {/* ---------- Story ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-surface-raised border-border rounded-[var(--m-radius-hero)] border p-5 shadow-sm">
          <p className="text-label text-fg-subtle mb-5 uppercase">Our story</p>
          {milestones.length > 0 ? (
            <div>
              {milestones.map((milestone, i) => (
                <MilestoneEntry key={milestone.id} milestone={milestone} delay={i * 60} isLast={i === milestones.length - 1} />
              ))}
            </div>
          ) : (
            <p className="font-serif-display text-[1.625rem] leading-[1.2] text-balance">{storyFallback}</p>
          )}
        </div>
      </section>

      {/* ---------- Vision ---------- */}
      <Reveal as="section" className="px-[var(--gutter)]">
        <div className="bg-accent text-accent-foreground relative overflow-hidden rounded-[var(--m-radius-hero)] p-6">
          <div aria-hidden className="absolute -top-12 -right-12 size-52 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_35%,transparent),transparent)]" />
          <Rule className="relative mb-5" />
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">Our vision</p>
          <p className="font-serif-display relative mt-3 text-[2rem] leading-[1.1] text-balance">{vision}</p>
        </div>
      </Reveal>

      {/* ---------- Process ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="How we work" description="Four steps, one accountable team" />
        <StepRail steps={process} />
      </section>

      {/* ---------- Values ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="What we stand for" />
        <ul className="flex flex-col gap-3 px-[var(--gutter)]">
          {values.map((value) => {
            const Icon = VALUE_ICONS[value.title] ?? ShieldCheck;
            return (
              <li
                key={value.title}
                className="bg-surface-raised border-border flex gap-4 rounded-[var(--m-radius-card)] border p-4"
              >
                <span className="bg-accent-soft text-accent flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">{value.title}</p>
                  <p className="text-body-sm text-fg-muted mt-1">{value.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- Expertise ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="What we're good at" />
        <div className="px-[var(--gutter)]">
          <Accordion
            variant="card"
            items={expertise.map((e) => ({
              id: e.title,
              title: e.title,
              content: <p className="text-body-sm text-fg-muted">{e.description}</p>,
            }))}
          />
        </div>
      </section>

      {/* ---------- Ways to work with us ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="Ways to work with us" description="Buyer, landowner, investor or partner" />
        <div className="grid grid-cols-2 gap-3 px-[var(--gutter)]">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.ctaHref}
              className="bg-surface-raised border-border flex min-h-36 flex-col justify-between rounded-[var(--m-radius-card)] border p-4 transition-transform active:scale-[0.97]"
            >
              <span className="font-serif-display text-fg-subtle text-2xl tabular-nums">{service.number}</span>
              <span>
                <span className="font-display block text-[0.9375rem] leading-snug font-semibold">{service.title}</span>
                <span className="text-accent mt-2 flex items-center gap-1 text-xs font-semibold">
                  {service.ctaLabel}
                  <ArrowRight aria-hidden className="size-3.5" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Real impact numbers (only those that are set) ---------- */}
      {impact.length > 0 && (
        <Reveal as="section" className="px-[var(--gutter)]">
          <p className="text-label text-fg-subtle mb-4 text-center uppercase">Our impact</p>
          <dl className="border-border grid grid-cols-2 gap-y-6 border-y py-6 text-center">
            {impact.map((s) => (
              <div key={s.label}>
                <dd className="font-serif-display text-[2.5rem] leading-none tabular-nums">
                  {s.value}
                  {s.suffix && <span className="text-xl">{s.suffix}</span>}
                </dd>
                <dt className="text-fg-muted mt-1.5 text-xs">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      )}

      {/* ---------- Closing ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-fg relative overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
          <div aria-hidden className="absolute -right-10 -bottom-10 size-52 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_28%,transparent),transparent)]" />
          <Rule className="relative mb-5" />
          <p className="font-serif-display relative text-[1.875rem] leading-[1.12] text-balance">{closing.statement}</p>
          <Link
            href="/contact"
            className="bg-bg text-fg relative mt-6 flex h-14 items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
          >
            Talk to our team
            <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
              <ArrowRight aria-hidden className="size-[18px]" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
