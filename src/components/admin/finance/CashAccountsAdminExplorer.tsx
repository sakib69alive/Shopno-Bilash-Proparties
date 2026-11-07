"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  createCashAccount,
  deleteCashAccount,
  setCashAccountStatus,
  type CashAccountFormState,
} from "@/features/finance/accountActions";
import type { CashAccount } from "@/types/finance/account";

export interface CashAccountsAdminExplorerProps {
  accounts: CashAccount[];
  canManage: boolean;
}

const TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "mobile-banking", label: "Mobile Banking" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Add Account
    </Button>
  );
}

function NewAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<CashAccountFormState, FormData>(createCashAccount, {});

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden className="size-3.5" />
        Add Account
      </Button>
    );
  }

  return (
    <PersistForm state={state} action={formAction} className="border-border flex flex-col gap-3 rounded-md border p-3">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-2.5 py-2">
          <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Name" name="name" required placeholder="e.g. Site Cash Box, BRAC Bank — Main" />
        <Select label="Type" name="type" required options={TYPE_OPTIONS} placeholder="Choose a type" />
        <Input label="Account Number (optional)" name="accountNumber" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Bank Name (optional)" name="bankName" />
        <Input label="Notes (optional)" name="notes" />
      </div>
      <div className="flex items-center gap-2">
        <SubmitButton />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </PersistForm>
  );
}

export function CashAccountsAdminExplorer({ accounts, canManage }: CashAccountsAdminExplorerProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(account: CashAccount) {
    if (!window.confirm(`Delete "${account.name}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteCashAccount(account.id);
    });
  }

  function handleToggleStatus(account: CashAccount) {
    startTransition(() => {
      setCashAccountStatus(account.id, account.status === "active" ? "inactive" : "active");
    });
  }

  const columns: DataTableColumn<CashAccount>[] = [
    { key: "name", header: "Name", render: (a) => a.name },
    { key: "type", header: "Type", render: (a) => TYPE_OPTIONS.find((t) => t.value === a.type)?.label ?? a.type },
    { key: "accountNumber", header: "Account No.", render: (a) => a.accountNumber ?? "—" },
    { key: "bankName", header: "Bank", render: (a) => a.bankName ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (a) => (
        <button
          type="button"
          disabled={!canManage || isPending}
          onClick={() => handleToggleStatus(a)}
          className={`text-caption rounded-full px-2 py-0.5 ${a.status === "active" ? "bg-success-soft text-success" : "bg-surface text-fg-muted"}`}
        >
          {a.status === "active" ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) =>
        canManage && (
          <IconButton icon={Trash2} label={`Delete ${a.name}`} size="sm" disabled={isPending} onClick={() => handleDelete(a)} className="hover:text-error" />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {canManage && <NewAccountForm />}
      {accounts.length === 0 ? (
        <EmptyState title="No accounts yet" description="Cash, bank, and mobile-banking accounts will appear here once your team adds one." />
      ) : (
        <DataTable columns={columns} data={accounts} getRowId={(a) => a.id} emptyTitle="No accounts" emptyDescription="" />
      )}
    </div>
  );
}
