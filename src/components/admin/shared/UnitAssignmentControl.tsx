"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

export interface AssignableUnit {
  id: string;
  unitNumber: string;
  sizeSqft: number;
}

export interface UnitAssignmentControlProps {
  assignedUnits: AssignableUnit[];
  availableUnits: AssignableUnit[];
  onAssign: (unitId: string) => Promise<{ error?: string }>;
  onUnassign: (unitId: string) => Promise<void>;
}

/**
 * Shared by the Shareholder and Landowner detail pages — both need the
 * same "hand this person a specific unit" control, just bound to a
 * different server action (`assignUnitToShareholding` vs
 * `createLandownerAllocation`). This is the write-side UI for the
 * unit-based-ownership model: a unit's size (not a typed-in percentage)
 * is what later drives its owner's share of a Cost Allocation.
 */
export function UnitAssignmentControl({ assignedUnits, availableUnits, onAssign, onUnassign }: UnitAssignmentControlProps) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    if (!selected) return;
    setError(undefined);
    startTransition(async () => {
      const result = await onAssign(selected);
      if (result.error) setError(result.error);
      else setSelected("");
    });
  }

  function handleUnassign(unitId: string) {
    if (!window.confirm("Remove this unit assignment?")) return;
    startTransition(() => {
      onUnassign(unitId);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {assignedUnits.length > 0 && (
        <ul className="flex flex-col gap-1">
          {assignedUnits.map((unit) => (
            <li key={unit.id} className="bg-surface flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5">
              <span className="text-body-sm text-fg">
                {unit.unitNumber} <span className="text-fg-subtle">· {unit.sizeSqft}<AdminText>{" sqft"}</AdminText></span>
              </span>
              <IconButton icon={X} label={`Remove ${unit.unitNumber}`} size="sm" disabled={isPending} onClick={() => handleUnassign(unit.id)} />
            </li>
          ))}
        </ul>
      )}

      {availableUnits.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="Choose a unit to assign"
            className="text-body-sm h-9 flex-1 rounded-md border border-border-strong bg-surface-raised px-2.5 text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          >
            <option value="">Choose an unowned unit</option>
            {availableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitNumber} ({unit.sizeSqft} sqft)
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={handleAssign} loading={isPending} disabled={!selected}>
            <AdminText>{"Assign"}</AdminText>
          </Button>
        </div>
      ) : (
        <p className="text-caption text-fg-subtle">No unowned units in this project.</p>
      )}

      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  );
}
