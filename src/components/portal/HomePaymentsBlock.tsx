"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBDT, formatDate } from "@/lib/format";
import { OWNER_PAYMENT_METHOD_LABEL } from "@/lib/ownerFriendlyLabels";
import type { LiveInstallmentStatus } from "@/lib/installmentStatus";
import { BottomSheet } from "@/components/mobile/BottomSheet";

export interface FlatInstallment {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  status: LiveInstallmentStatus;
  paidDate?: string;
  /** Part-payments: how much of this installment is covered, and what is still owed. */
  paidAmount?: number;
  remaining?: number;
}

export interface FlatPay {
  price: number;
  paid: number;
  remaining: number;
  percent: number;
  last: { amount: number; date: string; method: string } | null;
  next: { amount: number; dueDate: string; status: LiveInstallmentStatus; left: number } | null;
  installments?: FlatInstallment[];
}

export interface HomePaymentFlat {
  /** The flat's unit id. */
  id: string;
  unitNumber: string;
  projectName: string;
  /** null = no payment record for this flat (or the office switched it off). */
  pay: FlatPay | null;
  hidden: boolean;
}

const EYEBROW = "text-accent text-[0.6875rem] font-semibold tracking-[0.24em] uppercase";

/** Plain words for the live state of an installment: Paid, Pending (not due yet), Due soon, Overdue. */
const STATUS_WORD: Record<LiveInstallmentStatus, string> = {
  paid: "Paid",
  partial: "Partly paid",
  upcoming: "Pending",
  "due-soon": "Due soon",
  overdue: "Overdue",
};
const STATUS_STYLE: Record<LiveInstallmentStatus, string> = {
  paid: "bg-success-soft text-success",
  partial: "bg-warning-soft text-warning",
  upcoming: "bg-surface text-fg-muted",
  "due-soon": "bg-warning-soft text-warning",
  overdue: "bg-error-soft text-error",
};

function Chip({ status }: { status: LiveInstallmentStatus }) {
  return <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold", STATUS_STYLE[status])}>{STATUS_WORD[status]}</span>;
}

function Bar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("bg-border h-1 overflow-hidden rounded-full", className)}>
      <div className="bg-accent h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

/** What is due next for one flat, in one line with its live status — or that nothing is left. */
function NextLine({ pay }: { pay: FlatPay }) {
  if (pay.next) {
    return (
      <span className="mt-2.5 flex items-center justify-between gap-3">
        <span className="text-fg-muted min-w-0 text-xs">
          <span className="text-fg-subtle font-semibold tracking-wider uppercase">Next </span>
          {formatBDT(pay.next.amount)} · {formatDate(new Date(pay.next.dueDate))}
        </span>
        <Chip status={pay.next.status} />
      </span>
    );
  }
  return (
    <span className="mt-2.5 flex items-center justify-between gap-3">
      <span className="text-fg-muted text-xs">{pay.installments && pay.installments.length > 0 ? "Every installment is paid" : "No installment scheduled"}</span>
      {pay.installments && pay.installments.length > 0 && <Chip status="paid" />}
    </span>
  );
}

function FlatDetail({ flat, base }: { flat: HomePaymentFlat; base: string }) {
  const pay = flat.pay;
  if (flat.hidden) {
    return <p className="text-fg-muted text-sm">Payment details for this flat are not shown online right now. Please contact the office for your latest statement.</p>;
  }
  if (!pay) return <p className="text-fg-muted text-sm">No payment has been recorded for flat {flat.unitNumber} yet.</p>;

  return (
    <div>
      <p className="font-serif-display text-fg text-[2.25rem] leading-none">{formatBDT(pay.paid)} paid</p>
      <p className="text-fg-muted mt-2 text-sm">
        {formatBDT(pay.remaining)} remaining of {formatBDT(pay.price)}
      </p>
      <Bar percent={pay.percent} className="mt-4" />
      <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-fg-subtle">{pay.percent}% paid</span>
        {pay.last && (
          <span className="text-fg-muted text-right">
            Last {formatBDT(pay.last.amount)} · {formatDate(new Date(pay.last.date))} · {OWNER_PAYMENT_METHOD_LABEL[pay.last.method] ?? pay.last.method}
          </span>
        )}
      </div>

      {pay.installments && pay.installments.length > 0 && (
        <>
          <p className="text-fg-subtle mt-6 mb-2 text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">Installments</p>
          <ul className="bg-surface-raised border-border divide-border divide-y overflow-hidden rounded-2xl border">
            {pay.installments.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="text-fg block text-sm font-semibold">Installment {i.number}</span>
                  <span className="text-fg-subtle block text-xs">{i.status === "paid" && i.paidDate ? `Paid ${formatDate(new Date(i.paidDate))}` : `Due ${formatDate(new Date(i.dueDate))}`}</span>
                  {i.paidAmount !== undefined && i.paidAmount > 0 && i.status !== "paid" && (
                    <span className="text-warning block text-xs font-medium">
                      {formatBDT(i.paidAmount)} paid · {formatBDT(i.remaining ?? 0)} left
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-fg text-sm font-semibold tabular-nums">{formatBDT(i.amount)}</span>
                  <Chip status={i.status} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link href={`${base}/payments#flat-${flat.id}`} className="text-accent mt-5 inline-flex items-center gap-1 text-sm font-semibold">
        Every payment and receipt for this flat
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

/**
 * The Payments row of the phone home screen for an owner with flat-purchase
 * payments. It opens on ALL flats together — the grand total, then one card
 * per flat with its own balance, what is due next and that installment's live
 * status (Paid / Pending / Due soon / Overdue). Tapping a flat opens a sheet
 * with that flat alone: its numbers, every installment with its status, and a
 * link to the full payment list. A short note explains that the figures come
 * from the office's records and what to do if a payment is slow to appear.
 */
export function HomePaymentsBlock({ base, flats, combined, contactPhone }: { base: string; flats: HomePaymentFlat[]; combined: FlatPay | null; contactPhone?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = flats.find((f) => f.id === openId);
  const several = flats.length > 1 && combined !== null;
  const single = flats.length === 1 ? flats[0] : undefined;

  return (
    <div className="py-7">
      <p className={EYEBROW}>Payments</p>

      {several && combined ? (
        <>
          <p className="font-serif-display text-fg mt-3 text-[2.5rem] leading-none">{formatBDT(combined.paid)} paid</p>
          <p className="text-fg-muted mt-2 text-sm">
            {formatBDT(combined.remaining)} remaining of {formatBDT(combined.price)} across {flats.length} flats
          </p>
          <Bar percent={combined.percent} className="mt-4" />

          <p className="text-fg-subtle mt-6 mb-2.5 text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">Your flats · tap one for its details</p>
          <ul className="flex flex-col gap-3">
            {flats.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(f.id)}
                  aria-haspopup="dialog"
                  className="bg-surface-raised border-border active:bg-surface block w-full rounded-2xl border px-4 py-3.5 text-left shadow-sm transition-colors"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-fg block text-[1.0625rem] leading-tight font-semibold">{f.unitNumber}</span>
                      <span className="text-fg-subtle mt-0.5 block truncate text-xs">{f.projectName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {f.pay ? (
                        <span className="text-right">
                          <span className="text-fg block text-[0.9375rem] font-semibold tabular-nums">{formatBDT(f.pay.remaining)}</span>
                          <span className="text-fg-subtle block text-[0.6875rem]">left to pay</span>
                        </span>
                      ) : (
                        <span className="text-fg-subtle text-xs">{f.hidden ? "Ask the office" : "No payment record"}</span>
                      )}
                      <ChevronRight aria-hidden className="text-fg-subtle size-4" />
                    </span>
                  </span>
                  {f.pay && (
                    <>
                      <Bar percent={f.pay.percent} className="mt-3" />
                      <span className="text-fg-subtle mt-1.5 flex justify-between text-[0.6875rem]">
                        <span>
                          {formatBDT(f.pay.paid)} of {formatBDT(f.pay.price)}
                        </span>
                        <span>{f.pay.percent}%</span>
                      </span>
                      <NextLine pay={f.pay} />
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : single ? (
        <div className="mt-3">
          <FlatDetail flat={single} base={base} />
        </div>
      ) : (
        <p className="text-fg-muted mt-3 text-sm">Your payment details will appear here.</p>
      )}

      <p className="text-fg-subtle border-border mt-6 border-t pt-4 text-xs leading-relaxed">
        These figures come from the payments our office records, so a payment you made may take a little while to show here. If one is not showing after a few days, please contact us and keep your receipt or payment reference as your proof — we will update your account and sort it out with you.
      </p>
      {contactPhone && (
        <a href={`tel:${contactPhone.replace(/[^+\d]/g, "")}`} className="text-accent mt-3 inline-flex items-center gap-2 text-sm font-semibold">
          <Phone aria-hidden className="size-4" />
          Call the office · {contactPhone}
        </a>
      )}

      <BottomSheet open={openId !== null} onClose={() => setOpenId(null)} title={opened ? `Flat ${opened.unitNumber} · ${opened.projectName}` : "Flat"} className="lg:hidden" textured>
        {opened && <FlatDetail flat={opened} base={base} />}
      </BottomSheet>
    </div>
  );
}
