"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardList,
  Compass,
  FileText,
  Hammer,
  Handshake,
  HeartHandshake,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Phone,
  Ruler,
  Send,
  User,
  type LucideIcon,
} from "lucide-react";
import { submitEnquiry } from "@/components/contact/EnquiryForm";
import {
  capabilities,
  documentsNeeded,
  enquiry,
  hero,
  investment,
  jvProcess,
  statement,
  trust,
  twoPaths,
} from "@/content/partnership";
import type { Project } from "@/content/projects";
import { cn } from "@/lib/utils";
import { Accordion } from "./Accordion";
import { IconTile } from "./IconTile";
import { Rail } from "./Rail";
import { ProjectCardM } from "./ProjectCardM";
import { SectionHeading } from "./SectionHeading";
import { SelectField, TextAreaField, TextField } from "./Fields";

type Side = "landowner" | "investor";

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  "Development Planning": Compass,
  "Architecture & Design Coordination": Ruler,
  Construction: Hammer,
  "Project Management": ClipboardList,
  "Sales & Marketing": Megaphone,
  "Customer & Handover Management": HeartHandshake,
};

const SIDES: { value: Side; label: string }[] = [
  { value: "landowner", label: "Landowner" },
  { value: "investor", label: "Investor" },
];

const PARTNERSHIP_TYPES = [
  { value: "landowner", label: "Landowner" },
  { value: "investor", label: "Investor" },
  { value: "development-partner", label: "Development partner" },
  { value: "other", label: "Other" },
];

function Rule({ className }: { className?: string }) {
  return <span aria-hidden className={cn("bg-premium block h-px w-12", className)} />;
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-surface-raised border-border rounded-[var(--m-radius-card)] border p-5">
      <p className="font-display text-base font-semibold">{title}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="text-body-sm flex gap-3">
            <span className="bg-accent-soft text-accent mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check aria-hidden className="size-3" />
            </span>
            <span className="text-fg-muted">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The phone Landowners & JV page. One page, two audiences: a segmented
 * Landowner / Investor switch changes the dark lead card and everything under
 * it (the joint-venture steps and what we bring, or the investment principles
 * and current opportunities). `/landowners#investment` opens the Investor
 * side. Trust and the enquiry form are shared. Nothing is invented — the
 * opportunities are real projects still in development, and the form is the
 * same placeholder the other enquiry forms use.
 */
export function LandownersM({ projects }: { projects: Project[] }) {
  const [side, setSide] = useState<Side>("landowner");
  const switchRef = useRef<HTMLDivElement>(null);
  const enquiryRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "message", string>>>({});

  // `/landowners#investment` (and `#process`) pick the side; the same links also work when already on this page.
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash;
      if (hash === "#investment") setSide("investor");
      else if (hash === "#process") setSide("landowner");
      else return;
      requestAnimationFrame(() => switchRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const opportunities = projects.filter((p) => p.status !== "completed" && p.status !== "handed-over" && p.status !== "sold-out").slice(0, 4);
  const path = side === "landowner" ? twoPaths.landowner : twoPaths.investor;

  function goToEnquiry() {
    enquiryRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    const next: typeof errors = {};
    if (!name) next.name = "Please enter your name.";
    if (!phone) next.phone = "Please enter a phone number we can reach you on.";
    if (!message) next.message = "Please add a short message.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("loading");
    try {
      await submitEnquiry();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-10 pt-6 pb-8 lg:hidden">
      {/* ---------- Opening ---------- */}
      <section className="px-[var(--gutter)]">
        <p className="hero-in text-label text-fg-subtle uppercase" style={{ animationDelay: "0ms" }}>
          {hero.eyebrow}
        </p>
        <h1 className="font-serif-display hero-in mt-3 text-[3rem] leading-[1] text-balance" style={{ animationDelay: "100ms" }}>
          {hero.headline}
        </h1>
        <Rule className="hero-in mt-6" />
        <p className="hero-in text-fg-muted mt-5 text-[1.0625rem] leading-relaxed" style={{ animationDelay: "220ms" }}>
          {hero.supporting}
        </p>
      </section>

      {/* ---------- Audience switch + lead card ---------- */}
      <section className="px-[var(--gutter)]">
        <div
          ref={switchRef}
          role="tablist"
          aria-label="I am a"
          className="bg-surface border-border grid grid-cols-2 gap-1 rounded-full border p-1"
        >
          {SIDES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={side === s.value}
              onClick={() => setSide(s.value)}
              className={cn(
                "h-11 rounded-full text-[0.9375rem] font-semibold transition-colors duration-200",
                side === s.value ? "bg-accent text-accent-foreground shadow-sm" : "text-fg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div
          key={side}
          className={cn(
            "page-enter relative mt-4 overflow-hidden rounded-[var(--m-radius-hero)] p-6 text-white",
            side === "landowner" ? "bg-accent" : "bg-fg",
          )}
        >
          <div aria-hidden className="absolute -top-12 -right-12 size-52 [background:radial-gradient(closest-side,color-mix(in_srgb,var(--color-premium)_35%,transparent),transparent)]" />
          <Rule className="relative mb-5" />
          <p className="relative text-[11px] font-semibold tracking-[0.3em] text-white/60 uppercase">{path.label}</p>
          <h2 className="font-serif-display relative mt-3 text-[2.125rem] leading-[1.06] text-balance">{path.title}</h2>
          <p className="relative mt-3 text-[0.9375rem] leading-relaxed text-white/75">{path.description}</p>
          <button
            type="button"
            onClick={goToEnquiry}
            className="bg-bg text-fg relative mt-6 flex h-14 w-full items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
          >
            {side === "landowner" ? "Discuss my land" : "Discuss an opportunity"}
            <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
              <ArrowRight aria-hidden className="size-[18px]" />
            </span>
          </button>
        </div>
      </section>

      {/* ---------- Side-specific content ---------- */}
      {side === "landowner" ? (
        <>
          <section className="flex flex-col gap-4">
            <SectionHeading title="How a joint venture works" description="Six steps, one written agreement" />
            <ol className="flex flex-col px-[var(--gutter)]">
              {jvProcess.map((step, i) => (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < jvProcess.length - 1 && (
                    <span aria-hidden className="bg-border absolute top-10 bottom-0 left-5 w-px" />
                  )}
                  <span className="bg-accent text-accent-foreground relative flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <div className="bg-surface-raised border-border flex-1 rounded-[var(--m-radius-card)] border p-4">
                    <p className="font-display text-base leading-snug font-semibold">{step.title}</p>
                    <p className="text-body-sm text-fg-muted mt-1.5">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="What we bring" description="So you don't need development expertise" />
            <div className="grid grid-cols-2 gap-3 px-[var(--gutter)]">
              {capabilities.map((c) => (
                <IconTile key={c.title} icon={CAPABILITY_ICONS[c.title] ?? Hammer} title={c.title} description={c.description} />
              ))}
            </div>
          </section>

          <section className="px-[var(--gutter)]">
            <Checklist title={documentsNeeded.landowner.title} items={documentsNeeded.landowner.items} />
          </section>
        </>
      ) : (
        <>
          <section className="px-[var(--gutter)]">
            <p className="font-serif-display text-[1.875rem] leading-[1.12] text-balance">{investment.statement}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {investment.points.map((point) => (
                <li
                  key={point}
                  className="bg-surface-raised border-border flex gap-3 rounded-[var(--m-radius-card)] border p-4"
                >
                  <span className="bg-accent-soft text-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                  <p className="text-body-sm text-fg-muted">{point}</p>
                </li>
              ))}
            </ul>
          </section>

          {opportunities.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeading title="Current opportunities" description="Projects in development now" href="/projects" />
              <Rail>
                {opportunities.map((project) => (
                  <ProjectCardM key={project.id} project={project} layout="rail" />
                ))}
              </Rail>
            </section>
          )}

          <section className="px-[var(--gutter)]">
            <Checklist title={documentsNeeded.investor.title} items={documentsNeeded.investor.items} />
          </section>
        </>
      )}

      {/* ---------- Shared: statement + trust ---------- */}
      <section className="px-[var(--gutter)]">
        <div className="border-border border-y py-8">
          <p className="font-serif-display text-[1.625rem] leading-[1.2] text-balance">{statement}</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Why partners trust us" />
        <div className="px-[var(--gutter)]">
          <Accordion
            variant="card"
            items={trust.map((t) => ({
              id: t.title,
              title: t.title,
              content: <p className="text-body-sm text-fg-muted">{t.description}</p>,
            }))}
          />
        </div>
      </section>

      {/* ---------- Enquiry ---------- */}
      <section ref={enquiryRef} className="scroll-mt-20 px-[var(--gutter)]">
        <p className="text-label text-fg-subtle uppercase">{enquiry.eyebrow}</p>
        <h2 className="font-serif-display mt-2 text-[2.25rem] leading-[1.05] text-balance">{enquiry.headline}</h2>
        <p className="text-fg-muted mt-3 text-[0.9375rem] leading-relaxed">{enquiry.supporting}</p>

        {status === "success" ? (
          <div className="bg-surface-raised border-border mt-6 flex items-start gap-4 rounded-[var(--m-radius-hero)] border p-6">
            <span className="bg-accent-soft text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
              <Check aria-hidden className="size-5" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">Thank you.</p>
              <p className="text-fg-muted mt-1.5 text-[0.9375rem]">
                We&rsquo;ve received your message and our team will be in touch directly.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-surface-raised border-border mt-6 flex flex-col gap-4 rounded-[var(--m-radius-hero)] border p-5 shadow-md"
          >
            <TextField name="name" icon={User} label="Full name" autoComplete="name" placeholder="Your name" error={errors.name} />
            <TextField
              name="phone"
              icon={Phone}
              type="tel"
              inputMode="tel"
              label="Phone"
              autoComplete="tel"
              placeholder="01XXX-XXXXXX"
              error={errors.phone}
            />
            <SelectField
              key={side}
              icon={Handshake}
              name="partnershipType"
              label="I'm interested in"
              options={PARTNERSHIP_TYPES}
              defaultValue={side}
            />
            <TextAreaField name="message" icon={MessageSquare} label="Message" rows={4} placeholder="Tell us about your land or your interest" error={errors.message} />
            <TextField name="email" icon={Mail} type="email" inputMode="email" label="Email" optional autoComplete="email" />
            <TextAreaField
              name="propertyInfo"
              icon={MapPin}
              label="Property details"
              optional
              rows={2}
              placeholder="Location, size, or any relevant details"
              className="min-h-20"
            />

            {status === "error" && (
              <div role="alert" className="border-error/30 bg-error-soft flex items-start gap-3 rounded-[var(--m-radius-card)] border p-4">
                <AlertTriangle aria-hidden className="text-error mt-0.5 size-4 shrink-0" />
                <p className="text-body-sm text-error">Something went wrong sending your message. Nothing you entered was lost — please try again.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-accent text-accent-foreground text-button flex h-14 w-full items-center justify-center gap-2 rounded-full text-base transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {status === "loading" ? (
                "Sending…"
              ) : (
                <>
                  <Send aria-hidden className="size-[18px]" />
                  Send message
                </>
              )}
            </button>
            <p className="text-caption text-fg-subtle flex items-center justify-center gap-1.5 text-center">
              <FileText aria-hidden className="size-3.5" />
              No obligation — this is the start of a conversation.
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
