"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrustEmblem } from "@/components/ui/TrustEmblem";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { Check, Mail, MapPin, Clock, Phone, MessageCircle } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  PinterestIcon,
  ThreadsIcon,
  TiktokIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/ui/SocialIcons";
import { brandBlurb, footerGroups, footerHighlights, legalQuickLinks, statement } from "@/content/footer";
import type { CompanySettings } from "@/types/settings";
import { Logo } from "./Logo";

const SOCIAL_PLATFORMS = [
  { key: "socialInstagram", label: "Instagram", Icon: InstagramIcon },
  { key: "socialFacebook", label: "Facebook", Icon: FacebookIcon },
  { key: "socialTiktok", label: "TikTok", Icon: TiktokIcon },
  { key: "socialX", label: "X", Icon: XIcon },
  { key: "socialThreads", label: "Threads", Icon: ThreadsIcon },
  { key: "socialPinterest", label: "Pinterest", Icon: PinterestIcon },
  { key: "socialYoutube", label: "YouTube", Icon: YoutubeIcon },
  { key: "socialLinkedin", label: "LinkedIn", Icon: LinkedinIcon },
] as const satisfies { key: keyof CompanySettings; label: string; Icon: typeof InstagramIcon }[];

/**
 * The final architectural signature of the site: one large dark statement
 * band (echoing the Hero/Bridge/PartnershipHero dark family one last
 * time), then a calm, minimal nav on the usual light surface tone, a real
 * Contact/Follow row sourced from Settings, then a quiet legal/copyright
 * bar. Only routes that actually resolve are listed (content/footer.ts)
 * — no dead links; same rule for `settings` — every contact field and
 * every social icon renders only when it actually has a value, never a
 * placeholder or an invented link. The dark statement band is skipped on
 * pages that already end on their own dark full-bleed moment right above
 * the footer (`/founder`'s `FounderStatement`, `/services`'s
 * `ServicesEnquiryCTA`) — a second dark band immediately after read as
 * one dark section too many, back to back.
 */
const HIDE_STATEMENT_BAND_ON = new Set(["/founder", "/services"]);

export function Footer({ settings }: { settings: CompanySettings | null }) {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  // Strip a trailing slash before matching — an internal `<Link>` never
  // produces one, but a bookmarked/externally-linked "/founder/" shouldn't
  // fall through to showing the dark band this set exists to prevent.
  const normalizedPathname = (pathname ?? "").replace(/\/$/, "") || "/";
  const showStatementBand = !HIDE_STATEMENT_BAND_ON.has(normalizedPathname);

  const contactRows = settings
    ? [
        { Icon: Mail, label: "Email", value: settings.email, href: settings.email ? `mailto:${settings.email}` : undefined },
        { Icon: Phone, label: "Phone", value: settings.phone, href: settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, "")}` : undefined },
        {
          Icon: MessageCircle,
          label: "WhatsApp",
          value: settings.whatsapp,
          href: settings.whatsapp ? `https://wa.me/${settings.whatsapp.replace(/\D/g, "")}` : undefined,
        },
        { Icon: Clock, label: "Hours", value: settings.hours, href: undefined },
        { Icon: MapPin, label: "Address", value: settings.address, href: undefined },
      ].filter((row): row is (typeof row) & { value: string } => !!row.value)
    : [];
  const activeSocials = settings
    ? SOCIAL_PLATFORMS.map((platform) => ({ ...platform, url: settings[platform.key] }))
        .filter((platform): platform is typeof platform & { url: string } => !!platform.url)
    : [];
  const showContactRow = contactRows.length > 0 || activeSocials.length > 0;

  return (
    <footer>
      {showStatementBand && (
        <section data-header-tone="dark" className="bg-fg relative overflow-hidden py-20 sm:py-28 lg:py-32">
          <TrustEmblem
            fit="cover"
            className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-[72%] w-full -translate-y-1/2 text-white/10 sm:block"
          />
          <Container className="relative">
            <Reveal>
              <p className="text-display-l max-w-3xl text-balance text-white">{statement}</p>
            </Reveal>
          </Container>
        </section>
      )}

      <Section spacing="sm" background="surface">
        <Container>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <Reveal>
              <Logo src={settings?.logo} mode={settings?.logoMode} displayName={settings?.displayName} />
              <p className="text-body-sm text-fg-subtle mt-4 max-w-xs">{brandBlurb}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {footerHighlights.map((highlight) => (
                  <li key={highlight} className="text-body-sm text-fg-muted flex items-start gap-2.5">
                    <Check aria-hidden className="text-accent mt-0.5 size-4 shrink-0" />
                    {highlight}
                  </li>
                ))}
              </ul>
            </Reveal>

            {footerGroups.map((group, i) => (
              <Reveal key={group.title} delay={(i + 1) * 60}>
                <p className="text-label text-fg-subtle mb-4 uppercase">{group.title}</p>
                <ul className="flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-fg-muted hover:text-fg transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>

          {showContactRow && (
            <div className="border-border mt-12 flex flex-col gap-10 border-t pt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              {contactRows.length > 0 && (
                <Reveal>
                  <p className="text-label text-fg-subtle mb-4 uppercase">Contact</p>
                  <ul className="flex flex-col gap-3">
                    {contactRows.map(({ Icon, label, value, href }) => (
                      <li key={label} className="flex items-center gap-3">
                        <span className="border-border-strong text-fg-muted flex size-8 shrink-0 items-center justify-center rounded-full border">
                          <Icon aria-hidden className="size-3.5" />
                        </span>
                        <span className="text-body-sm">
                          <span className="text-fg-subtle">{label}: </span>
                          {href ? (
                            <a
                              href={href}
                              target={href.startsWith("http") ? "_blank" : undefined}
                              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                              className="text-fg-muted hover:text-fg transition-colors"
                            >
                              {value}
                            </a>
                          ) : (
                            <span className="text-fg-muted">{value}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}

              {activeSocials.length > 0 && (
                <Reveal delay={60}>
                  <p className="text-label text-fg-subtle mb-4 uppercase sm:text-right">Follow</p>
                  <ul className="flex items-center gap-3">
                    {activeSocials.map(({ key, label, Icon, url }) => (
                      <li key={key}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          title={label}
                          className="border-border-strong text-fg-muted hover:border-accent hover:text-accent flex size-10 items-center justify-center rounded-full border transition-colors"
                        >
                          <Icon className="size-4.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              )}
            </div>
          )}

          <div className="border-border mt-12 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-fg-subtle">
              © {year} Shopno Bilash Properties Ltd. All rights reserved.
            </p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalQuickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-caption text-fg-subtle hover:text-fg transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="text-caption text-fg-subtle hover:text-fg transition-colors">
                  Staff & Owner Login
                </Link>
              </li>
            </ul>
          </div>
        </Container>
      </Section>
    </footer>
  );
}
