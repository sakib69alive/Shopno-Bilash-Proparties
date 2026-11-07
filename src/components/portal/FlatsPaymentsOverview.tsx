import { ChevronRight } from "lucide-react";
import { formatBDT, formatDate } from "@/lib/format";
import { INSTALLMENT_STATUS_LABEL } from "@/lib/installmentStatus";
import type { OwnerSaleSummary } from "@/features/ownerPortal/queries";

/**
 * Top of the Payments page for an owner with more than one flat: the flats are
 * separate purchases, so first the grand total across all of them, then one
 * line per flat with ITS OWN paid / remaining and next installment. Each line
 * jumps to that flat's full details further down.
 */
export function FlatsPaymentsOverview({ summaries }: { summaries: OwnerSaleSummary[] }) {
  const shown = summaries.filter((s) => s.visible);
  if (summaries.length < 2) return null;

  const price = shown.reduce((a, s) => a + s.price, 0);
  const paid = shown.reduce((a, s) => a + s.paid, 0);
  const remaining = Math.max(0, price - paid);
  const percent = price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0;

  return (
    <section aria-label="All your flats">
      <p className="text-label text-fg-subtle uppercase">All your flats</p>
      <div className="border-border bg-surface-raised mt-4 rounded-2xl border p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3">
          <div className="flex items-baseline justify-between gap-3 sm:block">
            <p className="text-caption text-fg-subtle uppercase">Total price</p>
            <p className="text-h4 text-fg sm:mt-1">{formatBDT(price)}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3 sm:block">
            <p className="text-caption text-fg-subtle uppercase">Paid</p>
            <p className="text-h4 text-fg sm:mt-1">{formatBDT(paid)}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3 sm:block">
            <p className="text-caption text-fg-subtle uppercase">Remaining</p>
            <p className="text-h4 text-fg sm:mt-1">{formatBDT(remaining)}</p>
          </div>
        </div>
        <div className="bg-border mt-5 h-1.5 overflow-hidden rounded-full">
          <div className="bg-accent h-full rounded-full" style={{ width: `${Math.max(paid > 0 ? 2 : 0, percent)}%` }} />
        </div>
        <p className="text-caption text-fg-subtle mt-2">
          {percent}% paid across {shown.length} flats
        </p>
      </div>

      <ul className="border-border bg-surface-raised divide-border mt-4 divide-y overflow-hidden rounded-2xl border shadow-sm">
        {summaries.map((s) => {
          const next = s.visible ? s.installments.filter((i) => i.status !== "paid").sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] : undefined;
          return (
            <li key={s.saleId}>
              <a href={`#flat-${s.unitId}`} className="hover:bg-surface block p-4 transition-colors sm:p-5">
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="text-body text-fg block font-semibold">Unit {s.unitNumber}</span>
                    <span className="text-caption text-fg-subtle block">{s.projectName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {s.visible ? (
                      <span className="text-right">
                        <span className="text-body text-fg block font-semibold">{formatBDT(s.remaining)}</span>
                        <span className="text-caption text-fg-subtle block">left to pay</span>
                      </span>
                    ) : (
                      <span className="text-caption text-fg-subtle">Ask the office</span>
                    )}
                    <ChevronRight aria-hidden className="text-fg-subtle size-4" />
                  </span>
                </span>
                {s.visible && (
                  <>
                    <span className="bg-border mt-3 block h-1.5 overflow-hidden rounded-full">
                      <span className="bg-accent block h-full rounded-full" style={{ width: `${Math.max(s.paid > 0 ? 2 : 0, s.percentPaid)}%` }} />
                    </span>
                    <span className="text-caption text-fg-subtle mt-1.5 flex flex-wrap justify-between gap-x-4">
                      <span>
                        {formatBDT(s.paid)} of {formatBDT(s.price)} · {s.percentPaid}%
                      </span>
                      {next && (
                        <span>
                          Next {formatBDT(next.remaining)} · {formatDate(new Date(next.dueDate))} · {INSTALLMENT_STATUS_LABEL[next.status]}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
