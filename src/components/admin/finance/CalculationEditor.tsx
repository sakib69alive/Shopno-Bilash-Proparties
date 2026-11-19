"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveFinanceCalculation } from "@/features/finance/calculationActions";
import { calculateFinanceDraft, MAX_CALCULATION_LINES, type CalculationInput, type CalculationLine } from "@/lib/financeCalculation";
import { formatBDT } from "@/lib/format";

const EMPTY_LINE: CalculationLine = { description: "", amount: "0", quantity: "1", ratio: "1" };
const EMPTY: CalculationInput = { name: "", mode: "items", pool: "0", lines: [EMPTY_LINE] };

export function CalculationEditor({ initial, id, revision, canPost }: {
  initial?: CalculationInput;
  id?: string;
  revision: number;
  canPost: boolean;
}) {
  const [draft, setDraft] = useState(initial ?? EMPTY);
  const [state, formAction, pending] = useActionState(saveFinanceCalculation.bind(null, id ?? null, revision), {});
  const result = calculateFinanceDraft(draft);
  const changed = JSON.stringify(draft) !== JSON.stringify(initial ?? EMPTY);
  const split = draft.mode === "split";

  function updateLine(index: number, field: keyof CalculationLine, value: string) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line, position) => position === index ? { ...line, [field]: value } : line),
    }));
  }

  return (
    <form action={formAction} className="border-border bg-surface-raised flex min-w-0 flex-col gap-5 rounded-xl border p-4 sm:p-6">
      {state.error && <p role="alert" className="text-error"><AdminText>{state.error ?? ""}</AdminText></p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Calculation title" name="name" required maxLength={100} value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        <Select label="Calculation type" name="mode" options={[{ label: "Add item costs", value: "items" }, { label: "Split by ratio", value: "split" }]}
          value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value === "split" ? "split" : "items" })} />
      </div>
      {split && <Input label="Amount to split (BDT)" name="pool" inputMode="decimal" required value={draft.pool}
        onChange={(event) => setDraft({ ...draft, pool: event.target.value })} />}
      <div className="flex flex-col gap-3">
        {draft.lines.map((row, index) => (
          <div key={index} className="border-border grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]">
            <Input label={`Item ${index + 1}`} name="description" maxLength={150} value={row.description}
              onChange={(event) => updateLine(index, "description", event.target.value)} />
            {split ? (
              <Input label="Ratio weight" name="ratio" inputMode="decimal" required value={row.ratio}
                onChange={(event) => updateLine(index, "ratio", event.target.value)} />
            ) : (
              <>
                <Input label="Unit amount (BDT)" name="amount" inputMode="decimal" required value={row.amount}
                  onChange={(event) => updateLine(index, "amount", event.target.value)} />
                <Input label="Quantity" name="quantity" inputMode="decimal" required value={row.quantity}
                  onChange={(event) => updateLine(index, "quantity", event.target.value)} />
              </>
            )}
            <div className="flex flex-wrap items-center gap-2 sm:col-start-4 sm:justify-end">
              <span className="text-body-sm whitespace-nowrap tabular-nums">{result ? formatBDT(result.lines[index], 2) : "—"}</span>
              <button type="button" title={`Remove item ${index + 1}`} aria-label={`Remove item ${index + 1}`}
                className="text-fg-muted rounded-md px-2 py-2 text-sm disabled:opacity-30" disabled={draft.lines.length === 1}
                onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, position) => position !== index) })}><AdminText>{"Remove"}</AdminText></button>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" className="self-start" disabled={draft.lines.length >= MAX_CALCULATION_LINES}
          onClick={() => setDraft({ ...draft, lines: [...draft.lines, EMPTY_LINE] })}><AdminText>{"Add row"}</AdminText></Button>
      </div>
      <div className="bg-surface rounded-lg p-4">
        <p className="text-body-sm text-fg-muted"><AdminText>{"Calculation total"}</AdminText></p>
        <p className="text-h3 tabular-nums" aria-live="polite">{result ? formatBDT(result.total, 2) : "Check the values above"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!result} loading={pending}><AdminText>{"Save draft"}</AdminText></Button>
        {id && <Button type="submit" name="saveAsCopy" value="true" variant="secondary" disabled={!result || pending}><AdminText>{"Save a copy"}</AdminText></Button>}
        {id && canPost && !changed && !!result?.total && (
          <Link href={`/admin/finance/expenses/new?calculation=${encodeURIComponent(id)}`} className="text-accent text-sm font-medium underline underline-offset-4">
            <AdminText>{"Review as a project expense"}</AdminText>
          </Link>
        )}
      </div>
      {id && changed && canPost && <p className="text-body-sm text-fg-muted"><AdminText>{"Save your changes before reviewing an expense."}</AdminText></p>}
    </form>
  );
}
