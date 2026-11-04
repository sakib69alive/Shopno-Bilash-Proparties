import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { process } from "@/content/about";
import { pathways, services } from "@/content/services";
import { Accordion } from "./Accordion";
import { SectionHeading } from "./SectionHeading";
import { StepRail } from "./StepRail";

/**
 * The phone Services page below its (kept) opening: the six services as
 * tap-to-open cards — number, name, what it covers, who it's for and one
 * clear next step — then how a project moves, "where do you fit?" shortcuts
 * and a closing card. Everything comes from `content/services.ts`, the same
 * source the desktop page uses.
 */
export function ServicesM() {
  return (
    <div className="flex flex-col gap-10 pt-2 pb-8 lg:hidden">
      {/* ---------- The six services ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="Six ways to work with us" description="Tap one to see what it covers" />
        <div className="px-[var(--gutter)]">
          <Accordion
            variant="card"
            defaultOpen={[services[0]?.id ?? ""]}
            items={services.map((service) => ({
              id: service.id,
              title: (
                <span className="flex items-center gap-3.5">
                  <span className="font-serif-display text-fg-subtle w-8 shrink-0 text-[1.625rem] leading-none tabular-nums">
                    {service.number}
                  </span>
                  <span className="font-display leading-snug">{service.title}</span>
                </span>
              ),
              content: (
                <div className="pl-[2.875rem]">
                  <p className="text-body-sm text-fg-muted">{service.description}</p>

                  <p className="text-label text-fg-subtle mt-5 mb-2.5 uppercase">What it covers</p>
                  <ul className="flex flex-col gap-2.5">
                    {service.handles.map((item) => (
                      <li key={item} className="text-body-sm flex gap-2.5">
                        <span className="bg-accent-soft text-accent mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                          <Check aria-hidden className="size-3" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-label text-fg-subtle mt-5 mb-2 uppercase">Who it&rsquo;s for</p>
                  <p className="text-body-sm text-fg-muted">{service.whoFor}</p>

                  <Link
                    href={service.ctaHref}
                    className="bg-accent text-accent-foreground mt-5 flex h-12 items-center justify-between rounded-full pr-1.5 pl-5 text-sm font-semibold transition-transform active:scale-[0.98]"
                  >
                    {service.ctaLabel}
                    <span className="bg-bg text-accent flex size-9 items-center justify-center rounded-full">
                      <ArrowRight aria-hidden className="size-4" />
                    </span>
                  </Link>
                </div>
              ),
            }))}
          />
        </div>
      </section>

      {/* ---------- Process ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="How a project moves" description="Discover, plan, build, deliver" />
        <StepRail steps={process} />
      </section>

      {/* ---------- Where do you fit? ---------- */}
      <Reveal as="section" className="px-[var(--gutter)]">
        <p className="text-label text-fg-subtle uppercase">Where do you fit?</p>
        <ul className="bg-surface-raised border-border divide-border mt-3 divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
          {pathways.map((p) => (
            <li key={p.href + p.prompt}>
              <Link href={p.href} className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors active:bg-surface">
                <span className="min-w-0 flex-1">
                  <span className="font-serif-display block text-[1.25rem] leading-tight">{p.prompt}</span>
                  <span className="text-accent mt-1 block text-xs font-semibold">{p.label}</span>
                </span>
                <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-full">
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      {/* ---------- Closing ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-fg relative overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white">
          <div aria-hidden className="bg-premium/20 absolute -right-10 -bottom-10 size-52 rounded-full blur-3xl" />
          <span aria-hidden className="bg-premium relative mb-5 block h-px w-12" />
          <p className="text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase relative">Still not sure?</p>
          <p className="font-serif-display relative mt-3 text-[2rem] leading-[1.08] text-balance">
            Tell us what you&rsquo;re trying to do.
          </p>
          <Link
            href="/contact?type=general"
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
