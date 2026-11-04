"use client";

import { MessageCircle, Phone } from "lucide-react";
import { telHref, whatsappHref } from "@/lib/contactLinks";
import { cn } from "@/lib/utils";
import { useContactInfo } from "./MobileChrome";

export interface ContactActionsProps {
  /** "round" — two 44px icon buttons (top bar). "wide" — two labelled buttons side by side. */
  variant?: "round" | "wide";
  /** Prefilled WhatsApp message, e.g. the project or unit being viewed. */
  whatsappMessage?: string;
  className?: string;
}

/** WhatsApp and Call buttons from Admin → Settings. Each shows only if its number is set; renders nothing if neither is. */
export function ContactActions({ variant = "wide", whatsappMessage, className }: ContactActionsProps) {
  const { phone, whatsapp } = useContactInfo();
  if (!phone && !whatsapp) return null;

  if (variant === "round") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {whatsapp && (
          <a
            href={whatsappHref(whatsapp, whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="bg-accent-soft text-accent flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <MessageCircle aria-hidden className="size-5" />
          </a>
        )}
        {phone && (
          <a
            href={telHref(phone)}
            aria-label="Call us"
            className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-full transition-transform active:scale-95"
          >
            <Phone aria-hidden className="size-5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2.5", phone && whatsapp ? "grid-cols-2" : "grid-cols-1", className)}>
      {whatsapp && (
        <a
          href={whatsappHref(whatsapp, whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-accent-soft text-accent text-button flex h-12 items-center justify-center gap-2 rounded-full transition-transform active:scale-[0.97]"
        >
          <MessageCircle aria-hidden className="size-5" />
          WhatsApp
        </a>
      )}
      {phone && (
        <a
          href={telHref(phone)}
          className="bg-accent text-accent-foreground text-button flex h-12 items-center justify-center gap-2 rounded-full transition-transform active:scale-[0.97]"
        >
          <Phone aria-hidden className="size-5" />
          Call
        </a>
      )}
    </div>
  );
}
