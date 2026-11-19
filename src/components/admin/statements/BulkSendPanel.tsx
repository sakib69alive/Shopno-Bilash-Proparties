"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { bdWhatsAppNumber, whatsappHref } from "@/lib/contactLinks";
import { CustomerPicker, type PickRecipient } from "@/components/admin/statements/CustomerPicker";

export type BulkRecipient = PickRecipient;

/**
 * Pick several customers, press once, and each gets the notice with their own name in it on WhatsApp.
 * WhatsApp only lets a person send one chat at a time (a page may not open many tabs at once), so the button opens
 * the next chat with the message already written — you only tap Send there. Each person is ticked off once opened.
 */
export function BulkSendPanel({
  recipients,
  projects,
  buildMessage,
  blockedReason,
}: {
  recipients: BulkRecipient[];
  projects: { value: string; label: string }[];
  buildMessage: (name: string) => string;
  blockedReason?: string;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<Set<string>>(new Set());

  const chosen = recipients.filter((r) => picked.has(r.id));
  const waiting = chosen.filter((r) => !sent.has(r.id) && bdWhatsAppNumber(r.phone));
  const noPhone = chosen.filter((r) => !bdWhatsAppNumber(r.phone));

  function open(r: BulkRecipient) {
    const number = bdWhatsAppNumber(r.phone);
    if (!number || blockedReason) return;
    window.open(whatsappHref(number, buildMessage(r.name)), "_blank", "noopener,noreferrer");
    setSent((s) => new Set(s).add(r.id));
  }

  return (
    <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <p className="text-body-sm text-fg flex items-center gap-2 font-semibold">
          <Users aria-hidden className="text-accent size-4" />
          <AdminText>{"Send this notice to many customers"}</AdminText>
        </p>
        <p className="text-caption text-fg-subtle mt-0.5 leading-snug"><AdminText>{"Tick the names. Each person gets the text above with their own name in it, on WhatsApp."}</AdminText></p>
      </div>

      <CustomerPicker
        recipients={recipients}
        projects={projects}
        picked={picked}
        onPicked={(next) => {
          setPicked(next);
          if (next.size === 0) setSent(new Set());
        }}
        done={sent}
      />

      {blockedReason && <p className="text-caption text-warning"><AdminText>{blockedReason}</AdminText></p>}
      {noPhone.length > 0 && <p className="text-caption text-fg-subtle"><AdminText values={{ names: noPhone.map((r) => r.name).join(", ") }}>{"No phone number for {names}. These customers are skipped."}</AdminText></p>}

      <button
        type="button"
        disabled={waiting.length === 0 || !!blockedReason}
        onClick={() => open(waiting[0])}
        className="bg-accent text-accent-foreground text-body-sm inline-flex h-11 items-center justify-center gap-2 rounded-full font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageCircle aria-hidden className="size-4" />
        <AdminText values={{ count: waiting.length, name: waiting[0]?.name ?? "" }}>{chosen.length === 0
          ? "Choose customers first"
          : waiting.length === 0
            ? "All opened"
            : sent.size === 0
              ? "Send to {count} on WhatsApp"
              : "Open next ({count} left) — {name}"}</AdminText>
      </button>
      {waiting.length > 0 && chosen.length > 1 && (
        <p className="text-caption text-fg-subtle"><AdminText>{"WhatsApp opens one chat at a time with the message ready. Tap Send there, come back and press this again for the next person."}</AdminText></p>
      )}
    </div>
  );
}
