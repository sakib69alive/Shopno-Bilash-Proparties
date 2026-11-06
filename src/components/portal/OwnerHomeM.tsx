import Link from "next/link";
import { Bell, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { HomeBlueprint, type HomeBlueprintUnit } from "@/components/portal/HomeBlueprint";
import { HomeFlatProvider } from "@/components/portal/HomeFlatSelection";
import { HomePaymentsBlock, type FlatPay, type HomePaymentFlat } from "@/components/portal/HomePaymentsBlock";
import { formatBDT, formatDate } from "@/lib/format";
import { OWNER_PAYMENT_METHOD_LABEL } from "@/lib/ownerFriendlyLabels";
import { INSTALLMENT_STATUS_LABEL, type LiveInstallmentStatus } from "@/lib/installmentStatus";
import type { OwnerNextInstallment } from "@/features/ownerPortal/queries";

export interface OwnerHomeMProps {
  base: string;
  blueBlueprint?: boolean;
  /** The office phone number, for the "call us" link under the payments note. */
  contactPhone?: string;
  firstName: string;
  units: HomeBlueprintUnit[];
  totalPayable: number;
  totalPaid: number;
  totalOutstanding: number;
  percentPaid: number;
  nextInstallment: OwnerNextInstallment | null;
  /** Average construction progress across the owner's projects, or null when there are no updates yet. */
  built: number | null;
  currentStage?: string;
  /** Flat price / received / remaining (customers with a sale), with the latest payment. Shown ahead of the construction plan figures. */
  /** The office has switched this owner's flat money details off. */
  flatHidden?: boolean;
  flatPayments: {
    price: number;
    paid: number;
    remaining: number;
    percent: number;
    last: { amount: number; date: string; method: string } | null;
    /** The nearest installment still to pay, with its live status, and how many are left. */
    next: { amount: number; dueDate: string; status: LiveInstallmentStatus; left: number } | null;
  } | null;
  /** One entry per flat when the owner has flat-purchase payments, so the Payments row can follow the flat chosen at the top. */
  paymentFlats?: HomePaymentFlat[];
  documentCount: number;
  unreadCount: number;
}

export type { FlatPay };

const STATUS_LABEL: Record<OwnerNextInstallment["status"], string> = {
  upcoming: "Upcoming",
  due: "Due soon",
  overdue: "Overdue",
  "partially-paid": "Partially paid",
};

const EYEBROW = "text-accent text-[0.6875rem] font-semibold tracking-[0.24em] uppercase";

function Bar({ percent }: { percent: number }) {
  return (
    <div className="bg-border mt-4 h-1 overflow-hidden rounded-full">
      <div className="bg-accent h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

/**
 * The owner portal home on phones. The first screen is the owner's own flat:
 * its blueprint, as large as the screen allows, with the key numbers under it
 * and nothing else competing. Scroll once and the rest follows as plain
 * editorial rows — payments, construction, documents — rather than cards.
 * Only real figures are shown; with nothing behind them a row says so.
 */
export function OwnerHomeM(p: OwnerHomeMProps) {
  const hasPlan = p.totalPayable > 0;
  const flat = p.flatPayments;

  return (
    <HomeFlatProvider unitIds={p.units.map((u) => u.id)}>
    <div className="px-[var(--gutter)] pb-8 lg:hidden">
      {/* First screen: sized to what is left between the top bar and the tab bar. */}
      <div className="flex min-h-[calc(100svh-4.25rem-6.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col gap-5 pt-4">
        {p.units.length > 0 ? (
          <HomeBlueprint units={p.units} firstName={p.firstName} blue={p.blueBlueprint} className="flex-1" />
        ) : (
          <p className="text-fg-muted border-border flex-1 rounded-3xl border border-dashed p-6 text-sm">
            No residence is linked to your account yet. Please contact Shopno Bilash Properties Ltd.
          </p>
        )}

        <p aria-hidden className="text-fg-subtle flex items-center justify-center gap-1.5 text-xs">
          Payments &amp; progress
          <ChevronDown className="size-3.5" />
        </p>
      </div>

      <div className="divide-border border-border mt-6 divide-y border-t">
        {p.paymentFlats && p.paymentFlats.length > 0 && !p.flatHidden ? (
          <HomePaymentsBlock base={p.base} flats={p.paymentFlats} combined={flat} contactPhone={p.contactPhone} />
        ) : (
        <Link href={`${p.base}/payments`} className="active:bg-surface -mx-[var(--gutter)] block px-[var(--gutter)] py-7 transition-colors">
          <p className={EYEBROW}>Payments</p>
          {p.flatHidden ? (
            <p className="text-fg-muted mt-3 text-sm">Your payment details are not shown online right now. Please contact the office for your latest statement.</p>
          ) : flat ? (
            <>
              <p className="font-serif-display text-fg mt-3 text-[2.5rem] leading-none">{formatBDT(flat.paid)} paid</p>
              <p className="text-fg-muted mt-2 text-sm">
                {formatBDT(flat.remaining)} remaining of {formatBDT(flat.price)}
              </p>
              <Bar percent={flat.percent} />
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-fg-subtle">{flat.percent}% paid</span>
                {flat.last && (
                  <span className="text-fg-muted">
                    Last {formatBDT(flat.last.amount)} · {formatDate(new Date(flat.last.date))} · {OWNER_PAYMENT_METHOD_LABEL[flat.last.method] ?? flat.last.method}
                  </span>
                )}
              </div>
              {flat.next && (
                <div className="border-border mt-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-fg-subtle text-[0.6875rem] font-semibold tracking-[0.18em] uppercase">Next installment · {flat.next.left} left</p>
                    <p className="text-fg mt-0.5 text-sm">
                      {formatBDT(flat.next.amount)} · {formatDate(new Date(flat.next.dueDate))}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${
                      flat.next.status === "overdue" ? "bg-error-soft text-error" : flat.next.status === "due-soon" ? "bg-warning-soft text-warning" : "bg-surface text-fg-muted"
                    }`}
                  >
                    {INSTALLMENT_STATUS_LABEL[flat.next.status]}
                  </span>
                </div>
              )}
            </>
          ) : hasPlan ? (
            <>
              <p className="font-serif-display text-fg mt-3 text-[2.5rem] leading-none">{formatBDT(p.totalOutstanding)}</p>
              <p className="text-fg-muted mt-2 text-sm">remaining of {formatBDT(p.totalPayable)}</p>
              <Bar percent={p.percentPaid} />
              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-fg-subtle">{p.percentPaid}% paid</span>
                {p.nextInstallment && (
                  <span className="text-fg-muted">
                    Next {formatBDT(p.nextInstallment.amount)} · {formatDate(new Date(p.nextInstallment.dueDate))} · {STATUS_LABEL[p.nextInstallment.status]}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-fg-muted mt-3 text-sm">Your payment plan will appear here once it is set up.</p>
          )}
        </Link>
        )}

        <Link href={`${p.base}/construction`} className="active:bg-surface -mx-[var(--gutter)] block px-[var(--gutter)] py-7 transition-colors">
          <p className={EYEBROW}>Construction</p>
          {p.built !== null && p.built > 0 ? (
            <>
              <p className="font-serif-display text-fg mt-3 text-[2.5rem] leading-none">{p.built}% built</p>
              <p className="text-fg-muted mt-2 text-sm">{p.currentStage ? `${p.currentStage} — currently underway` : "Work is underway"}</p>
              <Bar percent={p.built} />
            </>
          ) : (
            <p className="text-fg-muted mt-3 text-sm">Progress updates and site photos will appear here as work advances.</p>
          )}
        </Link>

        {[
          { href: `${p.base}/documents`, icon: FileText, label: "Documents", hint: p.documentCount === 0 ? "None yet" : `${p.documentCount} available` },
          { href: `${p.base}/notifications`, icon: Bell, label: "Notifications", hint: p.unreadCount === 0 ? "All caught up" : `${p.unreadCount} unread` },
        ].map(({ href, icon: Icon, label, hint }) => (
          <Link key={href} href={href} className="active:bg-surface -mx-[var(--gutter)] flex items-center gap-4 px-[var(--gutter)] py-5 transition-colors">
            <span className="bg-surface text-accent flex size-10 shrink-0 items-center justify-center rounded-full">
              <Icon aria-hidden className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-fg block text-[0.9375rem] font-medium">{label}</span>
              <span className="text-fg-subtle block text-xs">{hint}</span>
            </span>
            <ChevronRight aria-hidden className="text-fg-subtle size-5" />
          </Link>
        ))}
      </div>
    </div>
    </HomeFlatProvider>
  );
}
