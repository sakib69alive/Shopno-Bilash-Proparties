"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Eye, EyeOff, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import {
  addSalePriceAdjustment,
  removeSalePriceAdjustment,
  setSaleOwnerVisibility,
  type PriceAdjustmentFormState,
} from "@/features/sales/priceActions";
import type { SalePriceAdjustment } from "@/types/sales";

function Submit({ children, variant = "primary" }: { children: React.ReactNode; variant?: "primary" | "outline" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} loading={pending}>
      {children}
    </Button>
  );
}

/**
 * Two controls an admin can use at any time on a sale: (1) change the price the
 * customer owes after the fact — every change is kept as a dated line with a
 * reason, and the customer's "remaining" follows; (2) switch the flat's money
 * details on or off on the owner's portal.
 */
export function SalePortalControls({
  saleId,
  agreedPrice,
  adjustments,
  hidden,
}: {
  saleId: string;
  agreedPrice: number;
  adjustments: SalePriceAdjustment[];
  hidden: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<PriceAdjustmentFormState, FormData>(async (prev, formData) => {
    const result = await addSalePriceAdjustment(saleId, prev, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, {});

  const net = adjustments.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Show / hide on the owner's portal */}
      <section className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-label text-fg-subtle uppercase">On the owner&rsquo;s portal</h3>
            <p className="text-h4 text-fg mt-1 inline-flex items-center gap-2">
              {hidden ? <EyeOff aria-hidden className="text-fg-subtle size-4" /> : <Eye aria-hidden className="text-success size-4" />}
              {hidden ? "Hidden" : "Shown"}
            </p>
          </div>
          <form action={setSaleOwnerVisibility.bind(null, saleId, hidden)}>
            <Submit variant={hidden ? "primary" : "outline"}>{hidden ? "Show to owner" : "Hide from owner"}</Submit>
          </form>
        </div>
        <p className="text-body-sm text-fg-muted">
          {hidden
            ? "The owner currently sees no price, payments or balance for this flat — only a note to contact the office."
            : "The owner sees this flat's price, what they have paid, what is left and every payment. Switch this off if the figures aren't ready; it takes effect straight away and you can turn it back on any time."}
        </p>
      </section>

      {/* Price changes */}
      <section className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="text-label text-fg-subtle uppercase">Change the price</h3>
        <p className="text-body-sm text-fg-muted">
          Agreed price {formatBDT(agreedPrice)}
          {adjustments.length > 0 && (
            <>
              {" "}
              · adjusted {net >= 0 ? "+" : "−"}
              {formatBDT(Math.abs(net))} · now <b className="text-fg">{formatBDT(Math.max(0, agreedPrice + net))}</b>
            </>
          )}
        </p>

        {adjustments.length > 0 && (
          <ul className="divide-border border-border divide-y rounded-md border">
            {adjustments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg">{a.reason}</p>
                  <p className="text-caption text-fg-subtle">{formatDate(new Date(a.date))}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={a.amount < 0 ? "text-success text-body-sm font-medium" : "text-warning text-body-sm font-medium"}>
                    {a.amount < 0 ? "−" : "+"}
                    {formatBDT(Math.abs(a.amount))}
                  </span>
                  <form action={removeSalePriceAdjustment.bind(null, saleId, a.id)}>
                    <button type="submit" aria-label="Remove this change" className="text-fg-subtle hover:text-error flex size-8 items-center justify-center rounded-md transition-colors">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form ref={formRef} action={formAction} className="flex flex-col gap-3">
          {state.error && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2.5">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p className="text-body-sm">{state.error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Change"
              name="direction"
              defaultValue="decrease"
              options={[
                { value: "decrease", label: "Reduce price" },
                { value: "increase", label: "Increase price" },
              ]}
            />
            <Input label="Amount (BDT)" name="amount" type="number" required min={1} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <Input label="Reason" name="reason" required placeholder="e.g. Discount agreed, extra parking" />
            <Input label="Date" name="date" type="date" />
          </div>
          <div>
            <Submit>Apply change</Submit>
          </div>
        </form>
      </section>
    </div>
  );
}
