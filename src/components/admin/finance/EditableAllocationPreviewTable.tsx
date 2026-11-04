"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBDT } from "@/lib/format";
import { generateContributions } from "@/features/costAllocations/actions";

export interface EditableUnitRow {
  id: string;
  unitNumber: string;
  ownerLabel: string;
  sizeSqft: number;
}

export interface EditableParkingRow {
  id: string;
  parkingNumber: string;
  ownerLabel: string;
}

export interface EditableAllocationPreviewTableProps {
  costAllocationId: string;
  totalAmount: number;
  units: EditableUnitRow[];
  parkingSpaces: EditableParkingRow[];
}

/** For "fixed-unit"/"custom" methods — there's no formula to preview, so the Admin types each unit's (and, if enabled, each parking space's) amount directly, with a running total shown against the target before confirming. */
export function EditableAllocationPreviewTable({ costAllocationId, totalAmount, units, parkingSpaces }: EditableAllocationPreviewTableProps) {
  const [unitAmounts, setUnitAmounts] = useState<Record<string, string>>({});
  const [parkingAmounts, setParkingAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const runningTotal = useMemo(() => {
    const unitSum = Object.values(unitAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
    const parkingSum = Object.values(parkingAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
    return unitSum + parkingSum;
  }, [unitAmounts, parkingAmounts]);

  const difference = totalAmount - runningTotal;

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const customUnitAmounts = Object.fromEntries(Object.entries(unitAmounts).map(([k, v]) => [k, Number(v) || 0]));
      const customParkingAmounts = Object.fromEntries(Object.entries(parkingAmounts).map(([k, v]) => [k, Number(v) || 0]));
      const result = await generateContributions(costAllocationId, customUnitAmounts, customParkingAmounts);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{error}</p>
        </div>
      )}

      <div className="border-border overflow-x-auto scrollbar-none rounded-lg border">
        <table className="w-full text-left">
          <thead>
            <tr className="border-border text-label text-fg-subtle border-b uppercase">
              <th className="px-4 py-2.5 font-normal">Unit</th>
              <th className="px-4 py-2.5 font-normal">Owner</th>
              <th className="px-4 py-2.5 text-right font-normal">Area</th>
              <th className="px-4 py-2.5 text-right font-normal">Amount (BDT)</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-border text-body-sm border-b last:border-b-0">
                <td className="px-4 py-2.5">{unit.unitNumber}</td>
                <td className="px-4 py-2.5 text-fg-muted">{unit.ownerLabel}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{unit.sizeSqft.toLocaleString()} sqft</td>
                <td className="px-4 py-2.5 text-right">
                  <input
                    type="number"
                    value={unitAmounts[unit.id] ?? ""}
                    onChange={(e) => setUnitAmounts((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                    className="text-body-sm h-9 w-32 rounded-md border border-border-strong bg-surface-raised px-2 text-right text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
            {parkingSpaces.map((parking) => (
              <tr key={parking.id} className="border-border text-body-sm border-b last:border-b-0">
                <td className="px-4 py-2.5">Parking {parking.parkingNumber}</td>
                <td className="px-4 py-2.5 text-fg-muted">{parking.ownerLabel}</td>
                <td className="px-4 py-2.5 text-right text-fg-subtle">—</td>
                <td className="px-4 py-2.5 text-right">
                  <input
                    type="number"
                    value={parkingAmounts[parking.id] ?? ""}
                    onChange={(e) => setParkingAmounts((prev) => ({ ...prev, [parking.id]: e.target.value }))}
                    className="text-body-sm h-9 w-32 rounded-md border border-border-strong bg-surface-raised px-2 text-right text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                    placeholder="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-border border-t">
              <td colSpan={3} className="px-4 py-2.5 text-body-sm font-medium">
                Entered Total
              </td>
              <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatBDT(runningTotal)}</td>
            </tr>
            <tr>
              <td colSpan={3} className={`text-body-sm px-4 py-2.5 ${difference !== 0 ? "text-warning" : "text-success"}`}>
                Difference from Target
              </td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${difference !== 0 ? "text-warning" : "text-success"}`}>
                {formatBDT(difference)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <Button onClick={handleConfirm} loading={isPending} disabled={runningTotal === 0}>
          Confirm &amp; Generate
        </Button>
      </div>
    </div>
  );
}
