import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/navigation/Logo";
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
import { brandBlurb, footerGroups, legalQuickLinks, statement } from "@/content/footer";
import { telHref, whatsappHref } from "@/lib/contactLinks";
import type { CompanySettings } from "@/types/settings";
import { Accordion } from "./Accordion";

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
 * Phone footer — a dark, rounded panel: logo and closing statement, call /
 * WhatsApp tiles, the remaining contact details that are actually set, social
 * icons, the link groups folded into an accordion, then the copyright line.
 * Only fields with a value render. Its bottom padding clears the fixed tab
 * bar / action bar.
 */
export function MobileFooter({ settings }: { settings: CompanySettings | null }) {
  const year = new Date().getFullYear();

  const detailRows = settings
    ? [
        { Icon: Mail, value: settings.email, href: settings.email ? `mailto:${settings.email}` : undefined },
        { Icon: Clock, value: settings.hours, href: undefined },
        { Icon: MapPin, value: settings.address, href: undefined },
      ].filter((row): row is (typeof row) & { value: string } => !!row.value)
    : [];
  const socials = settings
    ? SOCIAL_PLATFORMS.map((platform) => ({ ...platform, url: settings[platform.key] })).filter(
        (platform): platform is typeof platform & { url: string } => !!platform.url,
      )
    : [];
  const hasPhone = !!settings?.phone;
  const hasWhatsapp = !!settings?.whatsapp;

  return (
    <footer className="bg-fg text-white mt-6 rounded-t-[var(--m-radius-hero)] pt-9 pb-[calc(var(--m-bar-h)+env(safe-area-inset-bottom)+1.5rem)] lg:hidden">
      <div className="px-[var(--gutter)]">
        {/* Headline and logo share one height: the logo stretches to match the three-line headline beside it. */}
        <div className="flex items-stretch justify-between gap-3 pb-3">
          <p className="font-serif-display max-w-[11ch] text-[1.875rem] leading-[1.1] text-balance">{statement}</p>
          <div className="flex min-w-0 shrink-0 items-center justify-end">
            <Logo
              src={settings?.logo}
              mode={settings?.logoMode}
              displayName={settings?.displayName}
              tone="inverted"
              className="mr-2 h-[7.5rem] sm:h-[7.5rem]"
            />
          </div>
        </div>
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">{brandBlurb}</p>

        {(hasPhone || hasWhatsapp) && (
          <div className={`mt-7 grid gap-2.5 ${hasPhone && hasWhatsapp ? "grid-cols-2" : "grid-cols-1"}`}>
            {hasPhone && settings?.phone && (
              <a
                href={telHref(settings.phone)}
                className="flex flex-col items-start gap-3 rounded-[var(--m-radius-card)] bg-white/10 p-3.5 transition-transform active:scale-[0.97]"
              >
                <span className="bg-bg text-fg flex size-9 shrink-0 items-center justify-center rounded-full">
                  <Phone aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 max-w-full">
                  <span className="block text-sm font-semibold">Call us</span>
                  <span className="block truncate text-xs text-white/60">{settings.phone}</span>
                </span>
              </a>
            )}
            {hasWhatsapp && settings?.whatsapp && (
              <a
                href={whatsappHref(settings.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-start gap-3 rounded-[var(--m-radius-card)] bg-white/10 p-3.5 transition-transform active:scale-[0.97]"
              >
                <span className="bg-bg text-fg flex size-9 shrink-0 items-center justify-center rounded-full">
                  <MessageCircle aria-hidden className="size-4" />
                </span>
                <span className="min-w-0 max-w-full">
                  <span className="block text-sm font-semibold">WhatsApp</span>
                  <span className="block truncate text-xs text-white/60">Chat with us</span>
                </span>
              </a>
            )}
          </div>
        )}

        {detailRows.length > 0 && (
          <ul className="mt-6 flex flex-col gap-3.5">
            {detailRows.map(({ Icon, value, href }) => (
              <li key={value} className="flex items-start gap-3 text-sm leading-snug">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-white/50" />
                {href ? (
                  <a href={href} className="break-words text-white/80">
                    {value}
                  </a>
                ) : (
                  <span className="text-white/80">{value}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {socials.length > 0 && (
          <ul className="mt-6 flex items-center gap-2.5">
            {socials.map(({ key, label, Icon, url }) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/90"
                >
                  <Icon className="size-5" />
                </a>
              </li>
            ))}
          </ul>
        )}

        <Accordion
          className="mt-7 divide-white/10 border-y border-white/10 [&_h3_svg]:text-white/50 [&_h3_span]:text-[0.9375rem] [&_h3_span]:font-semibold"
          items={footerGroups.map((group) => ({
            id: group.title,
            title: group.title,
            content: (
              <ul className="grid grid-cols-2 gap-x-4">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="flex min-h-11 items-center text-sm text-white/70">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          }))}
        />

        <div className="pt-5">
          <p className="text-xs text-white/45">© {year} Shopno Bilash Properties Ltd. All rights reserved.</p>
          <ul className="mt-1 flex flex-wrap gap-x-4">
            {legalQuickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-11 items-center text-xs text-white/60">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
