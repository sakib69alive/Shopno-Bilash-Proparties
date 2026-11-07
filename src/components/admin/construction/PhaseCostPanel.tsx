"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { recordContractorPayment, type ContractorPaymentFormState } from "@/features/contractors/paymentActions";
import { PAYMENT_METHODS, TRANSACTION_STATUSES } from "@/config/expenseCategories";
import type { PhaseCostSummary } from "@/lib/constructionProgress";
import type { Purchase } from "@/types/procurement";
import type { ProjectExpense } from "@/types/finance/project";
import type { ContractorPayment, Contractor } from "@/types/contractor";
import type { CashAccount } from "@/types/finance/account";

export interface PhaseCostPanelProps {
  phaseId: string;
  projectId: string;
  summary: PhaseCostSummary;
  purchases: Purchase[];
  expenses: ProjectExpense[];
  payments: ContractorPayment[];
  contractors: Contractor[];
  accounts: CashAccount[];
  canManage: boolean;
}

const BUDGET_LABEL: Record<PhaseCostSummary["budgetStatus"], string> = {
  under: "Under Budget",
  on: "On Budget",
  over: "Over Budget",
  "no-estimate": "No Estimate Set",
};
const BUDGET_TONE: Record<PhaseCostSummary["budgetStatus"], string> = {
  under: "text-success",
  on: "text-fg",
  over: "text-error",
  "no-estimate": "text-fg-subtle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Record Payment
    </Button>
  );
}

/** Every number here is a sum over real transactions (Purchases/ProjectExpenses tagged to this phase, ContractorPayments recorded against it) — never an invented valuation, see `computePhaseActualCost`'s own doc comment. */
export function PhaseCostPanel({ phaseId, projectId, summary, purchases, expenses, payments, contractors, accounts, canManage }: PhaseCostPanelProps) {
  const boundAction = recordContractorPayment;
  const [state, formAction] = useActionState<ContractorPaymentFormState, FormData>(boundAction, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-surface-raised grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
        <div>
          <p className="text-caption text-fg-subtle uppercase">Estimated</p>
          <p className="text-body-sm text-fg mt-0.5">{formatBDT(summary.estimatedCost)}</p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle uppercase">Actual</p>
          <p className="text-body-sm text-fg mt-0.5 font-medium">{formatBDT(summary.actualCost)}</p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle uppercase">Variance</p>
          <p className={`text-body-sm mt-0.5 ${summary.variance > 0 ? "text-error" : summary.variance < 0 ? "text-success" : "text-fg"}`}>
            {summary.variance >= 0 ? "+" : ""}
            {formatBDT(summary.variance)}
          </p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle uppercase">Status</p>
          <p className={`text-body-sm mt-0.5 font-medium ${BUDGET_TONE[summary.budgetStatus]}`}>{BUDGET_LABEL[summary.budgetStatus]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-caption text-fg-subtle uppercase">Material Purchases</p>
          <p className="text-body-sm text-fg mt-0.5">{formatBDT(summary.materialCost)}</p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle uppercase">Other Expenses</p>
          <p className="text-body-sm text-fg mt-0.5">{formatBDT(summary.expenseCost)}</p>
        </div>
        <div>
          <p className="text-caption text-fg-subtle uppercase">Contractor Payments</p>
          <p className="text-body-sm text-fg mt-0.5">{formatBDT(summary.contractorCost)}</p>
        </div>
      </div>

      {(purchases.length > 0 || expenses.length > 0 || payments.length > 0) && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-fg-subtle uppercase">Traceable To</p>
          {purchases.map((p) => (
            <Link key={p.id} href={`/admin/procurement/purchases/${p.id}`} className="text-caption text-accent hover:text-accent-strong block transition-colors">
              Purchase — {formatBDT(p.total.amount)} ({formatDate(new Date(p.purchaseDate ?? p.createdAt))})
            </Link>
          ))}
          {expenses.map((e) => (
            <p key={e.id} className="text-caption text-fg-subtle">
              Expense — {e.description} — {formatBDT(e.amount.amount)} ({formatDate(new Date(e.date))})
            </p>
          ))}
          {payments.map((p) => (
            <p key={p.id} className="text-caption text-fg-subtle">
              Contractor Payment — {formatBDT(p.amount.amount)} ({formatDate(new Date(p.date))}){p.reference ? ` · ${p.reference}` : ""}
              {p.paymentMethod ? ` · ${PAYMENT_METHODS.find((m) => m.value === p.paymentMethod)?.label}` : ""}
              {p.status ? ` · ${TRANSACTION_STATUSES.find((s) => s.value === p.status)?.label}` : ""}
            </p>
          ))}
        </div>
      )}

      {canManage && (
        <PersistForm state={state} action={formAction} className="border-border flex flex-col gap-3 rounded-md border p-3">
          {state.error && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-caption">{state.error}</p>
            </div>
          )}
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="phaseId" value={phaseId} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Contractor"
              name="contractorId"
              required
              options={contractors.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Choose a contractor"
            />
            <Input label="Amount (BDT)" name="amount" type="number" required />
            <Input label="Date" name="date" type="date" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Payment Method (optional)" name="paymentMethod" options={PAYMENT_METHODS} placeholder="Not specified" />
            <Select
              label="Account (optional)"
              name="accountId"
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              placeholder={accounts.length > 0 ? "Not tagged to an account" : "No accounts yet"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Reference (optional)" name="reference" />
            <Input label="Notes (optional)" name="notes" />
          </div>
          <div>
            <Select label="Status (optional)" name="status" options={TRANSACTION_STATUSES} placeholder="Not specified" />
          </div>
          <div>
            <SubmitButton />
          </div>
        </PersistForm>
      )}
    </div>
  );
}
