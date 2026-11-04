import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  FileText,
  Gem,
  Hammer,
  Handshake,
  KeyRound,
  Send,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { capabilities, trust } from "@/content/home";
import type { Project } from "@/content/projects";
import { getProjectAvailability } from "@/lib/projectAvailability";
import type { PropertyListing } from "@/lib/properties";
import { ContactActions } from "./ContactActions";
import { HomeHeroM } from "./HomeHeroM";
import { IconTile } from "./IconTile";
import { SectionHeading } from "./SectionHeading";

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  "Property Development": Building2,
  "Construction & Delivery": Hammer,
  "Property Sales": KeyRound,
  "Landowner Partnerships": Handshake,
  "Investment Opportunities": TrendingUp,
  "Project Management": ClipboardList,
};

const PILLAR_ICONS: LucideIcon[] = [FileText, Gem, BadgeCheck];

const QUICK_LINKS: { label: string; hint: string; href: string; icon: LucideIcon }[] = [
  { label: "Projects", hint: "Our developments", href: "/projects", icon: Building2 },
  { label: "Homes", hint: "Available now", href: "/properties", icon: KeyRound },
  { label: "Land & JV", hint: "Partner with us", href: "/landowners", icon: Handshake },
  { label: "Enquire", hint: "Talk to our team", href: "/contact", icon: Send },
];

/** Line-art skyline, drawn rather than photographed — used on the dark cards when there is no photo to put behind them. */
function Skyline({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 360 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      <defs>
        <pattern id="home-windows" width="10" height="12" patternUnits="userSpaceOnUse">
          <rect x="2" y="3" width="5" height="6" strokeWidth="0.8" />
        </pattern>
      </defs>
      <line x1="0" y1="194" x2="360" y2="194" />
      <rect x="22" y="110" width="62" height="84" fill="url(#home-windows)" />
      <rect x="96" y="58" width="70" height="136" fill="url(#home-windows)" />
      <path d="M96 58 L131 38 L166 58" />
      <rect x="178" y="90" width="56" height="104" fill="url(#home-windows)" />
      <rect x="246" y="22" width="78" height="172" fill="url(#home-windows)" />
      <line x1="285" y1="22" x2="285" y2="6" />
      <circle cx="285" cy="4" r="2.5" />
    </svg>
  );
}

/**
 * The phone home page. Top to bottom: search, a full-bleed hero card (the
 * featured project's photo, or a drawn skyline when none exists) with a
 * floating quick-link card, a promise + real-numbers band, featured homes,
 * our developments, what we do, the landowner invitation, why people trust
 * us, and a closing contact card. Every figure comes from real project and
 * unit records — a number that is zero or unknown never appears — and every
 * section that has nothing to show quietly steps aside.
 */
export function HomeM({
  projects,
  listings,
  companyName,
}: {
  projects: Project[];
  listings: PropertyListing[];
  companyName: string;
}) {
  const units = listings.map((l) => ({ status: l.status, projectSlug: l.projectSlug }));
  const availableHomes = projects.reduce((sum, p) => sum + (getProjectAvailability(p, units).available ?? 0), 0);
  const cityCount = new Set(projects.map((p) => p.city)).size;
  const numbers = [
    { value: projects.length, label: projects.length === 1 ? "Development" : "Developments" },
    { value: cityCount, label: cityCount === 1 ? "City" : "Cities" },
    { value: availableHomes, label: "Homes available" },
  ].filter((n) => n.value > 0);

  return (
    <div className="flex flex-col gap-10 pt-3 pb-8 lg:hidden">
      {/* ---------- Hero ---------- */}
      <div>
        <HomeHeroM companyName={companyName} />
        <div className="px-[var(--gutter)]">
        {/* Where to go next: four tiles in the same language as the Menu sheet — icon, serif-weight label, one line of context. */}
        <nav aria-label="Quick links" className="mt-3 grid grid-cols-2 gap-3">
          {QUICK_LINKS.map(({ label, hint, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-surface-raised border-border group flex min-h-28 flex-col justify-between rounded-[var(--m-radius-card)] border p-4 transition-transform active:scale-[0.97]"
            >
              <span className="flex items-start justify-between">
                <span className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full">
                  <Icon aria-hidden className="size-5" />
                </span>
                <ArrowUpRight aria-hidden className="text-fg-subtle size-4" />
              </span>
              <span>
                <span className="font-display block text-base leading-tight font-semibold">{label}</span>
                <span className="text-fg-muted mt-0.5 block text-xs">{hint}</span>
              </span>
            </Link>
          ))}
        </nav>
        </div>
      </div>

      {/* ---------- Promise + real numbers ---------- */}
      <Reveal as="section" className="px-[var(--gutter)] text-center">
        <p className="text-label text-fg-subtle uppercase">Our promise</p>
        <p className="font-serif-display mx-auto mt-3 max-w-[20rem] text-[2rem] leading-[1.12] text-balance">
          Development is a promise. We build ours to last.
        </p>
        {numbers.length > 0 && (
          <dl className="border-border mt-7 grid divide-x divide-[var(--color-border)] border-y py-5" style={{ gridTemplateColumns: `repeat(${numbers.length}, minmax(0, 1fr))` }}>
            {numbers.map((n) => (
              <div key={n.label} className="px-2">
                <dd className="font-serif-display text-[2.5rem] leading-none tabular-nums">{n.value}</dd>
                <dt className="text-fg-muted mt-1.5 text-xs">{n.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </Reveal>

      {/* ---------- What we do ---------- */}
      <section className="flex flex-col gap-4">
        <SectionHeading title="What we do" description="One team, from the first plan to the keys" />
        <div className="grid grid-cols-2 gap-3 px-[var(--gutter)]">
          {capabilities.map((c) => (
            <IconTile
              key={c.title}
              icon={CAPABILITY_ICONS[c.title] ?? Building2}
              title={c.title}
              description={c.description}
            />
          ))}
        </div>
      </section>

      {/* ---------- Landowner invitation ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-accent text-accent-foreground relative overflow-hidden rounded-[var(--m-radius-hero)] p-6">
          <div aria-hidden className="bg-premium/25 absolute -right-12 -bottom-12 size-56 rounded-full blur-3xl" />
          <Skyline className="absolute right-[-3rem] bottom-0 w-80 text-white/15" />
          <span aria-hidden className="bg-premium relative mb-4 block h-px w-12" />
          <h2 className="font-serif-display relative max-w-[15rem] text-[2.125rem] leading-[1.05] text-balance">
            Own land? Let&rsquo;s develop it together.
          </h2>
          <p className="relative mt-3 max-w-[16rem] text-[0.9375rem] leading-relaxed text-white/75">
            Joint-venture partnerships with clear, fair, written terms.
          </p>
          <Link
            href="/landowners"
            className="bg-bg text-fg relative mt-6 inline-flex h-12 items-center gap-3 rounded-full pr-1.5 pl-5 text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            Partner with us
            <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
              <ArrowRight aria-hidden className="size-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* ---------- Trust ---------- */}
      <Reveal as="section" className="px-[var(--gutter)]">
        <p className="text-label text-fg-subtle uppercase">Why people trust us</p>
        <p className="font-serif-display mt-3 text-[2rem] leading-[1.1] text-balance">{trust.statement}</p>
        <ul className="mt-6 flex flex-col gap-3">
          {trust.pillars.map((pillar, i) => {
            const Icon = PILLAR_ICONS[i % PILLAR_ICONS.length];
            return (
              <li
                key={pillar.title}
                className="bg-surface-raised border-border flex gap-4 rounded-[var(--m-radius-card)] border p-4"
              >
                <span className="bg-accent-soft text-accent flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">{pillar.title}</p>
                  <p className="text-body-sm text-fg-muted mt-1">{pillar.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>

      {/* ---------- Closing ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="bg-surface border-border rounded-[var(--m-radius-hero)] border p-6 text-center">
          <h2 className="font-serif-display text-[2rem] leading-[1.08] text-balance">Ready when you are.</h2>
          <p className="text-fg-muted mx-auto mt-2 max-w-[17rem] text-[0.9375rem]">
            Tell us what you&rsquo;re looking for — a real person on our team will reply.
          </p>
          <ContactActions className="mt-5" />
          <Link
            href="/contact"
            className="border-accent text-accent mt-2.5 flex h-12 items-center justify-center rounded-full border text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            Send an enquiry
          </Link>
        </div>
      </section>
    </div>
  );
}
