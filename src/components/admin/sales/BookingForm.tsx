"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Booking } from "@/types/sales";
import type { Unit } from "@/types/unit";
import type { Customer } from "@/types/customer";
import type { Project } from "@/types/project";
import type { User } from "@/types/user";
import type { BookingFormState } from "@/features/sales/bookingActions";

export interface BookingFormProps {
  action: (state: BookingFormState, formData: FormData) => Promise<BookingFormState>;
  booking?: Booking;
  units: Unit[];
  customers: Customer[];
  projects: Project[];
  salespeople: User[];
  submitLabel: string;
  defaultUnitId?: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

/** Only units currently "available" can be booked (enforced again, server-side, in `createBooking` — Prompt 8 §4). The dropdown mirrors that so the form doesn't offer a choice the backend will reject. */
export function BookingForm({ action, booking, units, customers, projects, salespeople, submitLabel, defaultUnitId }: BookingFormProps) {
  const [state, formAction] = useActionState(action, {});
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const [unitId, setUnitId] = useState(booking?.unitId ?? defaultUnitId ?? "");

  const unitOptions = units
    .filter((u) => u.status === "available" || u.id === booking?.unitId)
    .map((u) => ({ value: u.id, label: `${u.unitNumber} — ${projectsById.get(u.projectId)?.name ?? "Unknown project"}` }));

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
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
        placeholder={unitOptions.length > 0 ? "Choose an available unit" : "No available units"}
      />

      <Select
        label="Customer"
        name="customerId"
        required
        options={customers.map((c) => ({ value: c.id, label: c.name }))}
        defaultValue={booking?.customerId}
        placeholder={customers.length > 0 ? "Choose a customer" : "No customers yet — add one first"}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Booking Date" name="bookingDate" type="date" required defaultValue={booking?.bookingDate} />
        <Input label="Expiry Date (optional)" name="expiryDate" type="date" defaultValue={booking?.expiryDate} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Booking Amount (BDT)" name="bookingAmount" type="number" required defaultValue={booking?.bookingAmount.amount} />
        <Input label="Agreed Price (BDT)" name="agreedPrice" type="number" required defaultValue={booking?.agreedPrice.amount} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Discount (optional)" name="discount" type="number" defaultValue={booking?.discount?.amount} />
        <Input label="Reference (optional)" name="reference" defaultValue={booking?.reference} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Payment Terms (optional)" name="paymentTerms" defaultValue={booking?.paymentTerms} />
        <Select
          label="Salesperson (optional)"
          name="salespersonId"
          options={salespeople.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={booking?.salespersonId}
          placeholder="Not assigned"
        />
      </div>

      <Textarea label="Notes (optional)" name="notes" rows={2} defaultValue={booking?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
