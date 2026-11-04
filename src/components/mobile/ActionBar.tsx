"use client";

import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { telHref, whatsappHref } from "@/lib/contactLinks";
import { useContactInfo, useRegisterActionBar } from "./MobileChrome";

export interface ActionBarProps {
  /** Where "Enquire" goes, e.g. `/contact?project=meridian&unit=a-502&type=buy`. */
  enquireHref: string;
  enquireLabel?: string;
  /** Prefilled WhatsApp message naming the project or unit being viewed. */
  whatsappMessage?: string;
}

/**
 * Detail pages' bottom bar — Call, WhatsApp, Enquire — which takes the
 * place of the tab bar on that page. It sits one layer above the tab bar
 * (`z-[41]`) and is the same height, so it covers it from the very first
 * paint; the tab bar then hides itself once this registers.
 */
export function ActionBar({ enquireHref, enquireLabel = "Enquire", whatsappMessage }: ActionBarProps) {
  useRegisterActionBar();
  const { phone, whatsapp } = useContactInfo();

  return (
    <div className="bg-bg border-border fixed inset-x-0 bottom-0 z-[41] rounded-t-[var(--m-radius-card)] border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgb(var(--shadow-color)/0.06)] lg:hidden">
      <div className="flex h-[var(--m-bar-h)] items-center gap-2.5 px-[var(--gutter)]">
        {phone && (
          <a
            href={telHref(phone)}
            aria-label="Call us"
            className="bg-accent-soft text-accent flex size-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Phone aria-hidden className="size-5" />
          </a>
        )}
        {whatsapp && (
          <a
            href={whatsappHref(whatsapp, whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="bg-accent-soft text-accent flex size-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <MessageCircle aria-hidden className="size-5" />
          </a>
        )}
        <Link
          href={enquireHref}
          className="bg-accent text-accent-foreground text-button flex h-12 min-w-0 flex-1 items-center justify-center rounded-full transition-transform active:scale-[0.97]"
        >
          {enquireLabel}
        </Link>
      </div>
    </div>
  );
}
