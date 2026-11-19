"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { createGoalInstallmentPlan, type InstallmentPlanInput } from "@/features/costAllocations/installmentActions";
import type { InstallmentAmountMode } from "@/types/finance/costAllocation";

export interface GoalInstallmentPlanFormProps {
  costAllocationId: string;
}

const AMOUNT_MODE_OPTIONS: { value: InstallmentAmountMode; label: string }[] = [
  { value: "percentage", label: "% of each owner's total" },
  { value: "fixed", label: "Fixed amount per owner" },
];

function defaultRow(n: number): InstallmentPlanInput {
  return { label: `Installment ${n}`, amountMode: "percentage", amountValue: 0, dueDate: "" };
}

/** Splits each owner's already-generated contribution into a schedule — percentages must sum to 100 (validated server-side too, since this only calls the server action directly, no <form>). */
export function GoalInstallmentPlanForm({ costAllocationId }: GoalInstallmentPlanFormProps) {
  const [rows, setRows] = useState<InstallmentPlanInput[]>([defaultRow(1), defaultRow(2)]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updateRow(index: number, patch: Partial<InstallmentPlanInput>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, defaultRow(prev.length + 1)]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    setError(undefined);
    if (rows.some((r) => !r.label || !r.dueDate || !r.amountValue)) {
      setError("Fill in every installment's label, amount, and due date.");
      return;
    }
    startTransition(async () => {
      const result = await createGoalInstallmentPlan(costAllocationId, rows);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const percentageMode = rows.every((r) => r.amountMode === "percentage");
  const totalPercent = rows.reduce((s, r) => s + (r.amountValue || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{error}</p>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="border-border grid grid-cols-1 items-end gap-3 rounded-md border p-3 sm:grid-cols-5">
          <Input label="Label" value={row.label} onChange={(e) => updateRow(i, { label: e.target.value })} />
          <Select
            label="Mode"
            options={AMOUNT_MODE_OPTIONS}
            value={row.amountMode}
            onChange={(e) => updateRow(i, { amountMode: e.target.value as InstallmentAmountMode })}
          />
          <Input
            label={row.amountMode === "percentage" ? "Percent" : "Amount (BDT)"}
            type="number"
            value={row.amountValue || ""}
            onChange={(e) => updateRow(i, { amountValue: Number(e.target.value) })}
          />
          <Input label="Due Date" type="date" value={row.dueDate} onChange={(e) => updateRow(i, { dueDate: e.target.value })} />
          <IconButton icon={Trash2} label="Remove installment" onClick={() => removeRow(i)} className="hover:text-error" />
        </div>
      ))}

      {percentageMode && (
        <p className={`text-body-sm ${totalPercent === 100 ? "text-success" : "text-warning"}`}><AdminText>{"Total: "}</AdminText>{totalPercent}% (must equal 100%)</p>
      )}

      <div className="flex items-center gap-2.5">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus aria-hidden className="size-3.5" />
          <AdminText>{"Add Installment"}</AdminText>
        </Button>
        <Button type="button" size="sm" onClick={handleSubmit} loading={isPending}>
          Create Installment Plan
        </Button>
      </div>
    </div>
  );
}
