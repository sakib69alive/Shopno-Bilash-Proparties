import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The phone home page's opening — a clean white card: the company's name,
 * a bold uppercase headline, and the hand holding a model house. Same
 * artwork (and the same "transparent layer on top" copy deterrent) as the
 * phone sign-in screen. No project photo and nothing invented.
 */
export function HomeHeroM({ companyName }: { companyName: string }) {
  return (
    <section className="px-[var(--gutter)]">
      <div className="bg-surface-raised border-border relative overflow-hidden rounded-[var(--m-radius-hero)] border px-5 pt-8 pb-6 text-center shadow-sm">
        <p
          className="hero-in text-fg-subtle text-[11px] font-semibold tracking-[0.3em] uppercase"
          style={{ animationDelay: "0ms" }}
        >
          {companyName}
        </p>

        <h1
          className="hero-in font-display mt-4 text-[2.5rem] leading-[0.98] font-extrabold tracking-tight text-balance uppercase"
          style={{ animationDelay: "120ms" }}
        >
          We shape land. We keep promises.
        </h1>

        <p
          className="hero-in text-fg-muted mx-auto mt-4 max-w-[19rem] text-[0.9375rem] leading-relaxed"
          style={{ animationDelay: "240ms" }}
        >
          Homes, joint ventures and construction — planned with care and delivered with honesty.
        </p>

        {/* White-background artwork: multiply lets the white card show through. The transparent layer takes pointer events
            so right-click / long-press / drag land on it, not the picture (a casual deterrent only). */}
        <div
          className="hero-in relative -mr-5 -ml-5 mt-5 flex justify-end select-none"
          style={{ animationDelay: "360ms" }}
        >
          <Image
            src="/login-house.webp"
            alt="A hand holding a model of a modern two-storey house"
            width={1100}
            height={974}
            priority
            unoptimized
            draggable={false}
            className="pointer-events-none h-auto w-full object-contain mix-blend-multiply"
          />
          <span aria-hidden className="absolute inset-0 z-10" />
        </div>

        <div className="hero-in mt-4 flex flex-col gap-2.5" style={{ animationDelay: "480ms" }}>
          <Link
            href="/projects"
            className="bg-accent text-accent-foreground flex h-14 items-center justify-between rounded-full pr-2 pl-6 text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
          >
            Explore our projects
            <span className="bg-bg text-accent flex size-10 items-center justify-center rounded-full">
              <ArrowRight aria-hidden className="size-[18px]" />
            </span>
          </Link>
          <Link
            href="/contact"
            className="border-border-strong text-fg flex h-12 items-center justify-center rounded-full border text-sm font-semibold transition-transform active:scale-[0.98]"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
