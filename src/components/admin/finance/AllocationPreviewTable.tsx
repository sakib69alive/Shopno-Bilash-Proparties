import Link from "next/link";
import { formatBDT } from "@/lib/format";
import type { AllocationPreview } from "@/features/costAllocations/actions";

export interface AllocationPreviewTableProps {
  preview: AllocationPreview;
  totalAmount: number;
}

/** Read-only — used for "sqft"/"unit-ratio" methods, where the amounts are formula-computed, not typed in by hand. */
export function AllocationPreviewTable({ preview, totalAmount }: AllocationPreviewTableProps) {
  return (
    <div className="border-border overflow-x-auto scrollbar-none rounded-lg border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-border text-label text-fg-subtle border-b uppercase">
            <th className="px-4 py-2.5 font-normal">Owner</th>
            <th className="px-4 py-2.5 font-normal">Unit(s)</th>
            <th className="px-4 py-2.5 font-normal">Basis</th>
            <th className="px-4 py-2.5 text-right font-normal">Payable</th>
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row) => (
            <tr key={`${row.ownerType}:${row.ownerId}`} className="border-border text-body-sm border-b last:border-b-0">
              <td className="px-4 py-2.5">
                {row.ownerHref ? (
                  <Link href={row.ownerHref} className="text-fg hover:text-accent transition-colors">
                    {row.ownerName}
                  </Link>
                ) : (
                  row.ownerName
                )}
              </td>
              <td className="px-4 py-2.5 text-fg-muted">
                {[...row.units.map((u) => u.unitNumber), ...row.parkingNumbers].join(", ") || "—"}
              </td>
              <td className="px-4 py-2.5 text-fg-muted">{row.basisLabel}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatBDT(row.payableAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-border border-t">
            <td colSpan={3} className="px-4 py-2.5 text-body-sm font-medium">
              Total Allocated
            </td>
            <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatBDT(preview.totalAllocated)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-body-sm text-fg-subtle px-4 py-2.5">
              Rounding Adjustment
            </td>
            <td className="text-fg-subtle px-4 py-2.5 text-right tabular-nums">{formatBDT(preview.roundingAdjustment)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-body-sm px-4 py-2.5">
              Target
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatBDT(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
