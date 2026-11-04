import { Download, Lock, Receipt } from "lucide-react";
import { formatBDT, formatDate } from "@/lib/format";
import { OWNER_PAYMENT_METHOD_LABEL } from "@/lib/ownerFriendlyLabels";
import { INSTALLMENT_STATUS_LABEL, type LiveInstallmentStatus } from "@/lib/installmentStatus";
import { Reveal } from "@/components/ui/Reveal";
import type { OwnerSaleSummary } from "@/features/ownerPortal/queries";

/**
 * What the owner has paid for their flat, straight from what the office
 * recorded: the flat's price, the total received, what is left, and then every
 * payment with its date, what it was for, how it was paid, the reference and
 * receipt number, and the balance remaining after it. Nothing is estimated —
 * with no payment recorded yet it says so.
 */
const STATUS_STYLE: Record<LiveInstallmentStatus, string> = {
  paid: "bg-success-soft text-success",
  overdue: "bg-error-soft text-error",
  "due-soon": "bg-warning-soft text-warning",
  upcoming: "bg-surface text-fg-muted",
};

export function SalePaymentsSection({ summaries }: { summaries: OwnerSaleSummary[] }) {
  if (summaries.length === 0) return null;

  return (
    <div className="flex flex-col gap-10">
      {summaries.map((sale) => {
        if (!sale.visible) {
          return (
            <Reveal key={sale.saleId}>
              <p className="text-label text-fg-subtle uppercase">
                {sale.projectName} · Unit {sale.unitNumber}
              </p>
              <h2 className="text-h2 text-fg mt-1">Your flat payments</h2>
              <div className="border-border bg-surface mt-5 flex items-start gap-3 rounded-2xl border p-5">
                <Lock aria-hidden className="text-fg-subtle mt-0.5 size-4 shrink-0" />
                <p className="text-body-sm text-fg-muted">
                  Your payment details for this flat are not shown online at the moment. Please contact Shopno Bilash Properties Ltd. for your latest statement.
                </p>
              </div>
            </Reveal>
          );
        }

        // Running balance after each payment, oldest first, then shown newest first.
        let running = sale.price;
        const withBalance = [...sale.payments]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((p) => {
            running = Math.max(0, running - p.amount);
            return { ...p, balanceAfter: running };
          })
          .reverse();

        return (
          <Reveal key={sale.saleId}>
            <p className="text-label text-fg-subtle uppercase">
              {sale.projectName} · Unit {sale.unitNumber}
            </p>
            <h2 className="text-h2 text-fg mt-1">Your flat payments</h2>

            <div className="border-border bg-surface-raised mt-5 rounded-2xl border p-5 shadow-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-caption text-fg-subtle uppercase">Flat price</p>
                  <p className="text-h4 text-fg mt-1">{formatBDT(sale.price)}</p>
                </div>
                <div>
                  <p className="text-caption text-fg-subtle uppercase">Paid</p>
                  <p className="text-h4 text-fg mt-1">{formatBDT(sale.paid)}</p>
                </div>
                <div>
                  <p className="text-caption text-fg-subtle uppercase">Remaining</p>
                  <p className="text-h4 text-fg mt-1">{formatBDT(sale.remaining)}</p>
                </div>
              </div>
              <div className="bg-border mt-5 h-1.5 overflow-hidden rounded-full">
                <div className="bg-accent h-full rounded-full" style={{ width: `${Math.max(sale.paid > 0 ? 2 : 0, sale.percentPaid)}%` }} />
              </div>
              {sale.adjustments.length > 0 && (
                <p className="text-caption text-fg-muted mt-1">
                  Agreed price {formatBDT(sale.agreedPrice)}, adjusted by {sale.price - sale.agreedPrice < 0 ? "−" : "+"}
                  {formatBDT(Math.abs(sale.price - sale.agreedPrice))}.
                </p>
              )}
              <p className="text-caption text-fg-subtle mt-2">
                {sale.percentPaid}% paid · {sale.payments.length} {sale.payments.length === 1 ? "payment" : "payments"} received
              </p>
            </div>

            {sale.installments.length > 0 && (
              <>
                <p className="text-label text-fg-subtle mt-8 mb-3 uppercase">
                  Installments · {sale.installments.filter((i) => i.status !== "paid").length} left
                </p>
                <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                  {sale.installments.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-body text-fg font-medium">Installment {i.number}</p>
                        <p className="text-caption text-fg-subtle mt-0.5">
                          {i.status === "paid" && i.paidDate ? `Paid ${formatDate(new Date(i.paidDate))}` : `Due ${formatDate(new Date(i.dueDate))}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="text-body text-fg font-medium">{formatBDT(i.amount)}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${STATUS_STYLE[i.status]}`}>{INSTALLMENT_STATUS_LABEL[i.status]}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {sale.adjustments.length > 0 && (
              <>
                <p className="text-label text-fg-subtle mt-8 mb-3 uppercase">Price changes</p>
                <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                  {sale.adjustments.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-body text-fg">{a.reason}</p>
                        <p className="text-caption text-fg-subtle mt-0.5">{formatDate(new Date(a.date))}</p>
                      </div>
                      <p className="text-body text-fg shrink-0 font-medium">
                        {a.amount < 0 ? "−" : "+"}
                        {formatBDT(Math.abs(a.amount))}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-label text-fg-subtle mt-8 mb-3 uppercase">Payments received</p>
            {withBalance.length === 0 ? (
              <p className="text-body-sm text-fg-muted border-border rounded-2xl border border-dashed p-5">
                No payment has been recorded for this flat yet. Each payment you make will appear here with its date and details.
              </p>
            ) : (
              <ul className="border-border bg-surface-raised divide-border divide-y overflow-hidden rounded-2xl border shadow-sm">
                {withBalance.map((p) => (
                  <li key={p.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-body text-fg font-medium">{p.label}</p>
                        <p className="text-caption text-fg-subtle mt-0.5">{formatDate(new Date(p.date))}</p>
                      </div>
                      <p className="text-h4 text-fg shrink-0">{formatBDT(p.amount)}</p>
                    </div>
                    <dl className="text-caption mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <dt className="text-fg-subtle">Paid by</dt>
                        <dd className="text-fg-muted">{OWNER_PAYMENT_METHOD_LABEL[p.method] ?? p.method}</dd>
                      </div>
                      <div>
                        <dt className="text-fg-subtle">Balance after</dt>
                        <dd className="text-fg-muted">{formatBDT(p.balanceAfter)}</dd>
                      </div>
                      {p.reference && (
                        <div>
                          <dt className="text-fg-subtle">Reference</dt>
                          <dd className="text-fg-muted break-words">{p.reference}</dd>
                        </div>
                      )}
                      {p.receiptNumber && (
                        <div>
                          <dt className="text-fg-subtle">Receipt no.</dt>
                          <dd className="text-fg-muted inline-flex items-center gap-1 break-words">
                            <Receipt aria-hidden className="size-3" />
                            {p.receiptNumber}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {p.receiptUrl && (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-accent hover:text-accent-strong mt-3 inline-flex items-center gap-1"
                      >
                        <Download aria-hidden className="size-3" />
                        {p.receiptName ?? "View receipt"}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        );
      })}
    </div>
  );
}
