"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Link2, Link2Off, MessageCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { formatDate } from "@/lib/format";
import { getPortalLink, regeneratePortalLink, revokePortalLink, type PortalLinkInfo } from "@/features/users/portalAccessActions";
import type { OwnerType } from "@/types/finance/costAllocation";

/** What the server already knows about this client's link when the page renders. */
export interface PortalLinkSummary {
  enabled: boolean;
  createdAt?: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface PortalLinkControlsProps {
  ownerType: OwnerType;
  ownerId: string;
  ownerName: string;
  phone?: string;
  summary?: PortalLinkSummary;
  /** `compact` = two small icon buttons (list rows, page headers). `full` = labelled buttons plus status and the "new link / turn off" controls. */
  variant: "compact" | "full";
}

/** Bangladesh mobile numbers are typed as 01XXXXXXXXX; wa.me needs the country code in front. */
function toWhatsAppNumber(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `88${digits}`;
  return digits;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older / non-secure contexts: fall back to a hidden textarea.
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

/** The link carries only a path; the domain is whatever address the admin is using right now, so there is nothing to reconfigure when the real domain is bought. */
function absoluteUrl(path: string): string {
  return `${window.location.origin}${path}`;
}

/**
 * The message the admin pastes/sends to a client: English, then Bangla, then the link last (so it's the easy thing to tap).
 * Says what the link is, what the client can do there, that records exist on the website AND in the hard copy,
 * and that the site is still in beta (so the client reports mistakes instead of worrying).
 */
function clientMessage(name: string, url: string): string {
  return [
    `*Dear ${name},*`,
    ``,
    `This is your personal Shopno Bilash Properties link. Open it to see your property, payment status and construction progress in one place, with documents and notices. No login is needed.`,
    ``,
    `Your details are kept both on this website and in your hard copy. The website is still in its beta version, so it may contain mistakes. If you notice anything wrong, please contact the company.`,
    ``,
    `Please keep this link private.`,
    ``,
    `────────────`,
    ``,
    `*প্রিয় ${name},*`,
    ``,
    `এটি Shopno Bilash Properties-এ আপনার নিজস্ব লিংক। এখানে আপনি আপনার প্রপার্টি, পেমেন্টের অবস্থা ও নির্মাণকাজের অগ্রগতি, সাথে ডকুমেন্ট ও নোটিশ এক জায়গায় দেখতে পাবেন। কোনো লগইন লাগবে না।`,
    ``,
    `আপনার তথ্য ওয়েবসাইট ও হার্ড কপি, দুই জায়গাতেই সংরক্ষিত আছে। ওয়েবসাইটটি এখনো বিটা ভার্সনে, তাই কিছু ভুলত্রুটি থাকতে পারে। কিছু ভুল দেখলে অনুগ্রহ করে কর্তৃপক্ষের সাথে যোগাযোগ করুন।`,
    ``,
    `লিংকটি অন্য কাউকে দেবেন না।`,
    ``,
    `────────────`,
    ``,
    `*Your link / আপনার লিংক:*`,
    url,
  ].join("\n");
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * The "copy this client's link" control the admin uses beside a client's
 * details. The link is created the first time it's asked for (and the
 * client's portal account with it), so there is no separate setup step.
 */
export function PortalLinkControls({ ownerType, ownerId, ownerName, phone, summary, variant }: PortalLinkControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<PortalLinkSummary>(summary ?? { enabled: false, useCount: 0 });
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  // Shown after a link is made, so the admin can read it or long-press-copy it if the browser blocks automatic copying.
  const [shownUrl, setShownUrl] = useState<string | undefined>();
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const whatsAppNumber = toWhatsAppNumber(phone);

  function applyLink(link: PortalLinkInfo) {
    setState({ enabled: true, createdAt: link.createdAt, lastUsedAt: link.lastUsedAt, useCount: link.useCount });
    setShownUrl(absoluteUrl(link.path));
  }

  function flashCopied() {
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2200);
  }

  function handleCopy() {
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const result = await getPortalLink(ownerType, ownerId);
      if (result.error || !result.link) {
        setError(result.error ?? "The link couldn't be created.");
        return;
      }
      applyLink(result.link);
      const ok = await copyToClipboard(clientMessage(firstName(ownerName), absoluteUrl(result.link.path)));
      if (ok) flashCopied();
      else setError("Couldn't copy automatically — use Send on WhatsApp instead, or copy the link below.");
    });
  }

  function handleWhatsApp() {
    if (!whatsAppNumber) return;
    setError(undefined);
    setNotice(undefined);
    // Opened before the server call: browsers only allow a new tab straight from a click.
    const tab = window.open("", "_blank");
    startTransition(async () => {
      const result = await getPortalLink(ownerType, ownerId);
      if (result.error || !result.link) {
        tab?.close();
        setError(result.error ?? "The link couldn't be created.");
        return;
      }
      applyLink(result.link);
      const target = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(clientMessage(firstName(ownerName), absoluteUrl(result.link.path)))}`;
      if (tab) tab.location.href = target;
      else window.location.href = target;
    });
  }

  function handleRegenerate() {
    if (
      !window.confirm(
        `Make a new link for ${ownerName}?\n\nTheir current link will stop working and any phone signed in with it will be signed out. You'll need to send them the new link.`,
      )
    ) {
      return;
    }
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const result = await regeneratePortalLink(ownerType, ownerId);
      if (result.error || !result.link) {
        setError(result.error ?? "The link couldn't be created.");
        return;
      }
      applyLink(result.link);
      const ok = await copyToClipboard(clientMessage(firstName(ownerName), absoluteUrl(result.link.path)));
      setNotice(ok ? "New link made and message copied. The old one no longer works." : "New link made. The old one no longer works.");
    });
  }

  function handleRevoke() {
    if (!window.confirm(`Turn off ${ownerName}'s link?\n\nThe link and every phone signed in with it will stop working.`)) return;
    setError(undefined);
    setNotice(undefined);
    startTransition(async () => {
      const result = await revokePortalLink(ownerType, ownerId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setState({ enabled: false, useCount: 0 });
      setShownUrl(undefined);
      setNotice("Link turned off.");
    });
  }

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1">
        <IconButton
          icon={copied ? Check : Link2}
          label={copied ? `Message copied for ${ownerName}` : `Copy message with login link for ${ownerName}`}
          size="sm"
          disabled={isPending}
          onClick={handleCopy}
          className={copied ? "text-success" : undefined}
        />
        {whatsAppNumber && (
          <IconButton
            icon={MessageCircle}
            label={`Send login link to ${ownerName} on WhatsApp`}
            size="sm"
            disabled={isPending}
            onClick={handleWhatsApp}
          />
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Link copied" : ""}
        </span>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{error}</p>
        </div>
      )}
      {notice && !error && (
        <p role="status" className="bg-accent-soft text-accent text-body-sm rounded-md px-3.5 py-2.5">
          {notice}
        </p>
      )}

      <p className="text-body-sm text-fg-muted">
        {state.enabled ? (
          state.useCount > 0 ? (
            <>
              Opened {state.useCount} time{state.useCount === 1 ? "" : "s"}
              {state.lastUsedAt ? <> · last on {formatDate(new Date(state.lastUsedAt))}</> : null}.
            </>
          ) : (
            "Link is ready — not opened yet."
          )
        ) : (
          "No link yet. Tap Copy link to make one."
        )}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handleCopy} loading={isPending} iconLeft={copied ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />}>
          {copied ? "Message copied" : "Copy message + link"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleWhatsApp}
          disabled={isPending || !whatsAppNumber}
          title={whatsAppNumber ? undefined : "Add a phone number to this client first"}
          iconLeft={<MessageCircle aria-hidden className="size-4" />}
        >
          Send on WhatsApp
        </Button>
      </div>

      {shownUrl && (
        <input
          type="text"
          readOnly
          value={shownUrl}
          aria-label={`Login link for ${ownerName}`}
          onFocus={(e) => e.currentTarget.select()}
          className="text-caption h-9 w-full rounded-md border border-border-strong bg-surface px-3 text-fg-muted outline-none focus:border-accent"
        />
      )}

      {state.enabled && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={isPending}
            className="text-body-sm text-fg-muted hover:text-fg inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw aria-hidden className="size-3.5" />
            Make a new link
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className="text-body-sm text-fg-muted hover:text-error inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Link2Off aria-hidden className="size-3.5" />
            Turn link off
          </button>
        </div>
      )}

      <p className="text-caption text-fg-subtle">
        Anyone who opens this link sees this client&apos;s own portal, and that phone stays signed in. Send it only to the client. To try it yourself, open it in a private window — opening it in your normal
        browser signs you out of Admin there.
      </p>
    </div>
  );
}
