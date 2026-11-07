"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { DEFAULT_EXPENSE_CATEGORIES, PAYMENT_METHODS, TRANSACTION_STATUSES } from "@/config/expenseCategories";
import type { ProjectExpense } from "@/types/finance/project";
import type { Project, Building } from "@/types/project";
import type { Vendor } from "@/types/procurement";
import type { ConstructionPhase } from "@/types/construction";
import type { Contractor } from "@/types/contractor";
import type { CashAccount } from "@/types/finance/account";
import type { ExpenseFormState } from "@/features/finance/expenseActions";

export interface ExpenseFormProps {
  action: (state: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  expense?: ProjectExpense;
  projects: Project[];
  vendors: Vendor[];
  phases: ConstructionPhase[];
  contractors: Contractor[];
  buildings: Building[];
  accounts: CashAccount[];
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

export function ExpenseForm({
  action,
  expense,
  projects,
  vendors,
  phases,
  contractors,
  buildings,
  accounts,
  submitLabel,
}: ExpenseFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [projectId, setProjectId] = useState(expense?.projectId ?? "");
  const phasesForProject = useMemo(() => phases.filter((p) => p.projectId === projectId), [phases, projectId]);
  const buildingsForProject = useMemo(() => buildings.filter((b) => b.projectId === projectId), [buildings, projectId]);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Select
        label="Project"
        name="projectId"
        required
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        placeholder={projects.length > 0 ? "Choose a project" : "No projects yet — add one first"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {phasesForProject.length > 0 && (
          <Select
            label="Construction Phase (optional)"
            name="constructionPhaseId"
            options={phasesForProject.map((p) => ({ value: p.id, label: p.name }))}
            defaultValue={expense?.constructionPhaseId}
            placeholder="Not tagged to a specific phase"
          />
        )}
        {buildingsForProject.length > 0 && (
          <Select
            label="Building (optional)"
            name="buildingId"
            options={buildingsForProject.map((b) => ({ value: b.id, label: b.name }))}
            defaultValue={expense?.buildingId}
            placeholder="Not tagged to a specific building"
          />
        )}
      </div>

      <Input label="Description" name="description" required defaultValue={expense?.description} placeholder="What was this cost for?" />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-category" className="text-label text-fg-muted">
            Category
          </label>
          <input
            id="expense-category"
            name="category"
            list="expense-category-options"
            required
            defaultValue={expense?.category}
            placeholder="e.g. Materials, Labor, Permits"
            className="text-body h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3.5 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <datalist id="expense-category-options">
            {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <Input label="Subcategory (optional)" name="subcategory" defaultValue={expense?.subcategory} placeholder="e.g. Cement, Rebar" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Amount (BDT)" name="amount" type="number" required defaultValue={expense?.amount.amount} />
        <Input label="Date" name="date" type="date" required defaultValue={expense?.date} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Payment Method (optional)"
          name="paymentMethod"
          options={PAYMENT_METHODS}
          defaultValue={expense?.paymentMethod}
          placeholder="Not specified"
        />
        <Select
          label="Account (optional)"
          name="accountId"
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          defaultValue={expense?.accountId}
          placeholder={accounts.length > 0 ? "Not tagged to an account" : "No accounts yet"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Vendor (optional)"
          name="vendorId"
          options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          defaultValue={expense?.vendorId}
          placeholder={vendors.length > 0 ? "Not linked to a vendor" : "No vendors yet"}
        />
        <Select
          label="Contractor (optional)"
          name="contractorId"
          options={contractors.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={expense?.contractorId}
          placeholder={contractors.length > 0 ? "Not linked to a contractor" : "No contractors yet"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Status (optional)"
          name="status"
          options={TRANSACTION_STATUSES}
          defaultValue={expense?.status}
          placeholder="Not specified"
        />
        <Input label="Reference (optional)" name="reference" defaultValue={expense?.reference} placeholder="e.g. Invoice number" />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
