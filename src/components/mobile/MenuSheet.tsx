"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  Building,
  Building2,
  ChevronRight,
  Hammer,
  Handshake,
  Heart,
  House,
  Images,
  KeyRound,
  Lock,
  MessageCircle,
  Newspaper,
  Phone,
  Search,
  Send,
  TrendingUp,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PUBLIC_PRIMARY_CTA } from "@/config/navigation";
import { useSearch } from "@/components/search/SearchContext";
import { telHref, whatsappHref } from "@/lib/contactLinks";
import { cn } from "@/lib/utils";
import { BottomSheet } from "./BottomSheet";
import { useMobileChrome } from "./MobileChrome";

interface MenuLink {
  label: string;
  href: string;
  hint: string;
  icon: LucideIcon;
}

// Every public page, grouped — the tab bar's pages come first, so the menu is a complete map of the site.
const GROUPS: { title: string; links: MenuLink[] }[] = [
  {
    title: "Browse",
    links: [
      { label: "Home", href: "/", hint: "Back to the start", icon: House },
      { label: "Projects", href: "/projects", hint: "Every development we build", icon: Building2 },
      { label: "Properties", href: "/properties", hint: "Homes and plots available now", icon: KeyRound },
      { label: "Saved", href: "/saved", hint: "Homes you have shortlisted", icon: Heart },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about", hint: "Who we are and how we work", icon: Building },
      { label: "Services", href: "/services", hint: "What we offer", icon: Wrench },
      { label: "Founder", href: "/founder", hint: "The people behind the company", icon: User },
      { label: "Construction", href: "/construction", hint: "Progress on our sites", icon: Hammer },
    ],
  },
  {
    title: "Partner with us",
    links: [
      { label: "Landowners & JV", href: "/landowners", hint: "Develop your land with us", icon: Handshake },
      { label: "Investment", href: "/landowners#investment", hint: "Back a development", icon: TrendingUp },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Gallery", href: "/gallery", hint: "Photos and progress", icon: Images },
      { label: "News", href: "/news", hint: "Updates from the company", icon: Newspaper },
    ],
  },
  {
    title: "Get in touch",
    links: [{ label: "Enquire", href: "/contact", hint: "Send us a message", icon: Send }],
  },
];

function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** Whether a menu link points at the page the visitor is on (Landowners and Investment share a path and differ by hash). */
function isCurrent(href: string, pathname: string, hash: string): boolean {
  const [path, anchor] = href.split("#");
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (path === "/landowners") return anchor ? hash === `#${anchor}` : hash !== "#investment";
  return true;
}

/**
 * The "Menu" tab's bottom sheet: search, every public page the tab bar
 * doesn't cover (grouped, with a line on each), a dark "talk to us" card with
 * WhatsApp / Call / Enquire, and the sign-in entry for owners and staff.
 */
export function MenuSheet() {
  const { menuOpen, closeMenu, contact } = useMobileChrome();
  const { openSearch } = useSearch();
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");

  // Close after navigating (a same-page hash link wouldn't change the pathname, so links also close it on tap).
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  function handleSearch() {
    closeMenu();
    openSearch();
  }

  return (
    <BottomSheet open={menuOpen} onClose={closeMenu} title="Menu" className="lg:hidden" textured>
      <button
        type="button"
        onClick={handleSearch}
        className="bg-surface text-fg-muted flex h-12 w-full items-center gap-3 rounded-full px-4 text-[0.9375rem] transition-transform active:scale-[0.98]"
      >
        <Search aria-hidden className="size-[18px]" />
        Search projects and properties
      </button>

      <nav aria-label="Pages" className="mt-5 flex flex-col gap-5">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="text-label text-fg-subtle mb-2 px-1 uppercase">{group.title}</h3>
            <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-[var(--m-radius-card)] border">
              {group.links.map(({ label, href, hint, icon: Icon }) => {
                const current = isCurrent(href, pathname, hash);
                return (
                  <li key={href} className="relative">
                    <Link
                      href={href}
                      onClick={closeMenu}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "flex min-h-16 items-center gap-3.5 px-3.5 py-2.5 transition-colors active:bg-surface",
                        current && "bg-accent-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-full",
                          current ? "bg-accent text-accent-foreground" : "bg-accent-soft text-accent",
                        )}
                      >
                        <Icon aria-hidden className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("font-display block text-[0.9375rem] leading-tight font-semibold", current && "text-accent")}>
                          {label}
                        </span>
                        <span className="text-fg-muted mt-0.5 block truncate text-xs">{current ? "You are here" : hint}</span>
                      </span>
                      {current ? (
                        <span aria-hidden className="bg-accent size-2 shrink-0 rounded-full" />
                      ) : (
                        <ChevronRight aria-hidden className="text-fg-subtle size-4 shrink-0" />
                      )}
                    </Link>
                    {current && <span aria-hidden className="bg-accent absolute top-3 bottom-3 left-0 w-1 rounded-r-full" />}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>

      {/* Dark card, same family as the footer */}
      <section className="bg-fg mt-6 rounded-[var(--m-radius-hero)] p-5 text-white">
        <h3 className="font-serif-display text-[1.75rem] leading-tight">Let&rsquo;s talk about your next home.</h3>
        {(contact.whatsapp || contact.phone) && (
          <div className={`mt-4 grid gap-2.5 ${contact.whatsapp && contact.phone ? "grid-cols-2" : "grid-cols-1"}`}>
            {contact.whatsapp && (
              <a
                href={whatsappHref(contact.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/12 text-sm font-semibold transition-transform active:scale-[0.97]"
              >
                <MessageCircle aria-hidden className="size-[18px]" />
                WhatsApp
              </a>
            )}
            {contact.phone && (
              <a
                href={telHref(contact.phone)}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-white/12 text-sm font-semibold transition-transform active:scale-[0.97]"
              >
                <Phone aria-hidden className="size-[18px]" />
                Call
              </a>
            )}
          </div>
        )}
        <Link
          href={PUBLIC_PRIMARY_CTA.href}
          onClick={closeMenu}
          className="bg-bg text-fg mt-2.5 flex h-12 items-center justify-between rounded-full pr-1.5 pl-5 text-sm font-semibold transition-transform active:scale-[0.98]"
        >
          Enquire now
          <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
            <ArrowRight aria-hidden className="size-4" />
          </span>
        </Link>
      </section>

      <Link
        href="/login"
        onClick={closeMenu}
        className="border-border-strong text-fg mt-4 flex h-14 items-center justify-center gap-2.5 rounded-full border text-[0.9375rem] font-semibold transition-transform active:scale-[0.98]"
      >
        <Lock aria-hidden className="text-accent size-[18px]" />
        Sign in to your account
      </Link>
    </BottomSheet>
  );
}
