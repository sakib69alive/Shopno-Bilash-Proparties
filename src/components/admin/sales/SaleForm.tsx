"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Sale } from "@/types/sales";
import type { Unit } from "@/types/unit";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";
import type { User } from "@/types/user";
import type { SaleFormState } from "@/features/sales/actions";

export interface SaleFormProps {
  action: (state: SaleFormState, formData: FormData) => Promise<SaleFormState>;
  sale?: Sale;
  units: Unit[];
  customers: Customer[];
  projects: Project[];
  salespeople: User[];
  submitLabel: string;
  /** Presets the unit when arriving from that unit's own "Record a Sale" action. */
  defaultUnitId?: string;
  /** Set when converting a Booking into a Sale — prefills unit/customer/price and links back via `bookingId`. */
  defaultCustomerId?: string;
  defaultAgreedPrice?: number;
  bookingId?: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "flat", label: "Flat (BDT)" },
  { value: "percentage", label: "Percentage of Base Price" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

/**
 * The unit dropdown includes every currently-available unit, plus (when
 * editing) whichever unit this sale already points at — even if that unit
 * now reads "Sold" because of this very sale — so editing a sale never
 * silently drops its own unit from the list.
 */
export function SaleForm({
  action,
  sale,
  units,
  customers,
  projects,
  salespeople,
  submitLabel,
  defaultUnitId,
  defaultCustomerId,
  defaultAgreedPrice,
  bookingId,
}: SaleFormProps) {
  const [state, formAction] = useActionState(action, {});
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const [unitId, setUnitId] = useState(sale?.unitId ?? defaultUnitId ?? "");
  const selectedUnit = useMemo(() => units.find((u) => u.id === unitId), [units, unitId]);

  const unitOptions = units
    .filter((u) => u.status === "available" || u.id === sale?.unitId || u.id === defaultUnitId)
    .map((u) => ({
      value: u.id,
      label: `${u.unitNumber} — ${projectsById.get(u.projectId)?.name ?? "Unknown project"}`,
    }));

  const basePriceDefault = sale?.basePrice.amount ?? defaultAgreedPrice ?? selectedUnit?.finalPrice.amount;

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Select
        label="Unit"
        name="unitId"
        required
        options={unitOptions}
        value={unitId}
        onChange={(e) => setUnitId(e.target.value)}
        placeholder={unitOptions.length > 0 ? "Choose an available unit" : "No available units — add one first"}
      />

      <Select
        label="Customer"
        name="customerId"
        required
        options={customers.map((c) => ({ value: c.id, label: c.name }))}
        defaultValue={sale?.customerId ?? defaultCustomerId}
        placeholder={customers.length > 0 ? "Choose a customer" : "No customers yet — add one first"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Sale Date" name="saleDate" type="date" required defaultValue={sale?.saleDate} />
        <Input
          label="Base Price (BDT)"
          name="basePrice"
          type="number"
          required
          defaultValue={basePriceDefault}
          helperText="The unit's own reference price — kept separate from the negotiated final price below."
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Floor Premium (optional)" name="floorPremium" type="number" defaultValue={sale?.floorPremium?.amount} />
        <Input label="Parking Price (optional)" name="parkingPrice" type="number" defaultValue={sale?.parkingPrice?.amount} />
        <Input label="Additional Charges (optional)" name="additionalCharges" type="number" defaultValue={sale?.additionalCharges?.amount} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Discount Amount (optional)" name="discountAmount" type="number" defaultValue={sale?.discountAmount?.amount} />
        <Select label="Discount Type" name="discountType" options={DISCOUNT_TYPE_OPTIONS} defaultValue={sale?.discountType ?? "flat"} />
        <Input label="Discount Reason (optional)" name="discountReason" defaultValue={sale?.discountReason} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Payment Terms (optional)" name="paymentTerms" defaultValue={sale?.paymentTerms} placeholder="e.g. 20% down, rest on handover" />
        <Select
          label="Salesperson (optional)"
          name="salespersonId"
          options={salespeople.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={sale?.salespersonId}
          placeholder="Not assigned"
        />
      </div>

      <Select label="Status" name="status" options={STATUS_OPTIONS} defaultValue={sale?.status ?? "completed"} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
