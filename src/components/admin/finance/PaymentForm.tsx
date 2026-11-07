"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { CustomerPayment, PaymentMethod } from "@/types/finance/customer";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";
import type { PaymentFormState } from "@/features/finance/paymentActions";

export interface PaymentFormProps {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  payment?: CustomerPayment;
  customers: Customer[];
  projects: Project[];
  /** Every flat sale, so a payment can be filed against the exact flat it pays for. */
  sales?: PaymentFormSale[];
  /** Prefill when arriving from a sale's page. */
  defaultCustomerId?: string;
  defaultSaleId?: string;
  submitLabel: string;
}

export interface PaymentFormSale {
  id: string;
  customerId: string;
  /** e.g. "A-502 — Meridian Residences · price ৳14,500,000". */
  label: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "mobile-banking", label: "Mobile Banking" },
  { value: "card", label: "Card" },
];

export function PaymentForm({ action, payment, customers, projects, sales = [], defaultCustomerId, defaultSaleId, submitLabel }: PaymentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [customerId, setCustomerId] = useState(payment?.customerId ?? defaultCustomerId ?? "");
  const customerSales = sales.filter((x) => x.customerId === customerId);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Customer"
          name="customerId"
          required
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder={customers.length > 0 ? "Choose a customer" : "No customers yet — add one first"}
        />
        <Select
          label="Project (optional)"
          name="projectId"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={payment?.projectId}
          placeholder={projects.length > 0 ? "Not linked to a project" : "No projects yet"}
        />
      </div>

      {customerSales.length > 0 && (
        <Select
          key={customerId}
          label="Which flat is this payment for?"
          name="saleId"
          options={customerSales.map((x) => ({ value: x.id, label: x.label }))}
          defaultValue={payment?.saleId ?? defaultSaleId ?? (customerSales.length === 1 ? customerSales[0].id : undefined)}
          placeholder="Not linked to a specific flat"
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Amount (BDT)" name="amount" type="number" required defaultValue={payment?.amount.amount} />
        <Select label="Method" name="method" required options={METHOD_OPTIONS} defaultValue={payment?.method} placeholder="Choose a method" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Category" name="category" required defaultValue={payment?.category} placeholder="e.g. Down Payment, Installment" />
        <Input label="Date" name="date" type="date" required defaultValue={payment?.date} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Receipt # (optional)" name="receiptNumber" defaultValue={payment?.receiptNumber} />
        <Input label="Reference (optional)" name="reference" defaultValue={payment?.reference} />
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
