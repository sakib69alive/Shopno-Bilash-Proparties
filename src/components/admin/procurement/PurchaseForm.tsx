"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatBDT } from "@/lib/format";
import type { Purchase, Vendor, Material } from "@/types/procurement";
import type { Project } from "@/types/project";
import type { ConstructionPhase } from "@/types/construction";
import type { PurchaseFormState } from "@/features/procurement/purchaseActions";

export interface PurchaseFormProps {
  action: (state: PurchaseFormState, formData: FormData) => Promise<PurchaseFormState>;
  purchase?: Purchase;
  vendors: Vendor[];
  projects: Project[];
  materials: Material[];
  phases: ConstructionPhase[];
  submitLabel: string;
  /** True once any receipt exists against this purchase — material/quantity/price/project/supplier become read-only, everything else stays editable. */
  locked?: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially-paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
];

/** Extended for Chapter 2 Prompt 4 — one material per purchase, with real quantity/unit-price so `total` is always `quantity × unitPrice`, never a hand-typed lump sum. */
export function PurchaseForm({ action, purchase, vendors, projects, materials, phases, submitLabel, locked }: PurchaseFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [materialId, setMaterialId] = useState(purchase?.materialId ?? "");
  const [quantity, setQuantity] = useState(purchase?.quantity ?? "");
  const [unitPrice, setUnitPrice] = useState(purchase?.unitPrice?.amount ?? "");
  const [projectId, setProjectId] = useState(purchase?.projectId ?? "");

  const material = useMemo(() => materials.find((m) => m.id === materialId), [materials, materialId]);
  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const phasesForProject = useMemo(() => phases.filter((p) => p.projectId === projectId), [phases, projectId]);

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}
      {locked && purchase ? (
        <>
          <p className="text-body-sm bg-warning-soft text-warning rounded-md px-3.5 py-3">
            This purchase already has receipts recorded — material, quantity, price, project, and supplier are locked to keep inventory history accurate.
          </p>
          <input type="hidden" name="vendorId" value={purchase.vendorId} />
          <input type="hidden" name="projectId" value={purchase.projectId} />
          <input type="hidden" name="materialId" value={purchase.materialId} />
          <input type="hidden" name="quantity" value={purchase.quantity} />
          <input type="hidden" name="unitPrice" value={purchase.unitPrice?.amount ?? 0} />
          <div className="grid gap-4 sm:grid-cols-2">
            <p className="text-body-sm text-fg-muted">
              Supplier: <span className="text-fg font-medium">{vendors.find((v) => v.id === purchase.vendorId)?.name ?? "—"}</span>
            </p>
            <p className="text-body-sm text-fg-muted">
              Project: <span className="text-fg font-medium">{projects.find((p) => p.id === purchase.projectId)?.name ?? "—"}</span>
            </p>
            <p className="text-body-sm text-fg-muted">
              Material: <span className="text-fg font-medium">{material?.name ?? "—"}</span>
            </p>
            <p className="text-body-sm text-fg-muted">
              Quantity × Price:{" "}
              <span className="text-fg font-medium tabular-nums">
                {purchase.quantity} {purchase.unit} × {formatBDT(purchase.unitPrice?.amount ?? 0)}
              </span>
            </p>
          </div>
          {phases.filter((p) => p.projectId === purchase.projectId).length > 0 && (
            <Select
              label="Construction Phase (optional)"
              name="constructionPhaseId"
              options={phases.filter((p) => p.projectId === purchase.projectId).map((p) => ({ value: p.id, label: p.name }))}
              defaultValue={purchase.constructionPhaseId}
              placeholder="Not tagged to a specific phase"
            />
          )}
        </>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label="Supplier"
              name="vendorId"
              required
              options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              defaultValue={purchase?.vendorId}
              placeholder={vendors.length > 0 ? "Choose a supplier" : "No suppliers yet — add one first"}
            />
            <Select
              label="Project"
              name="projectId"
              required
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder={projects.length > 0 ? "Choose a project" : "No projects yet"}
            />
          </div>

          {phasesForProject.length > 0 && (
            <Select
              label="Construction Phase (optional)"
              name="constructionPhaseId"
              options={phasesForProject.map((p) => ({ value: p.id, label: p.name }))}
              defaultValue={purchase?.constructionPhaseId}
              placeholder="Not tagged to a specific phase"
            />
          )}

          <Select
            label="Material"
            name="materialId"
            required
            options={materials.map((m) => ({ value: m.id, label: `${m.name}${m.brand ? ` — ${m.brand}` : ""} (${m.unit})` }))}
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            placeholder={materials.length > 0 ? "Choose a material" : "Add a material first"}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label={`Quantity${material ? ` (${material.unit})` : ""}`}
              name="quantity"
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="Unit Price (BDT)"
              name="unitPrice"
              type="number"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              helperText={material?.defaultPrice ? `Reference price: ${formatBDT(material.defaultPrice.amount)}` : undefined}
            />
          </div>
        </>
      )}

      <p className="text-body-sm text-fg-muted">
        Total: <span className="text-fg font-medium tabular-nums">{formatBDT(total)}</span>
      </p>

      <Input label="Purchase Date" name="purchaseDate" type="date" required defaultValue={purchase?.purchaseDate} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Invoice # (optional)" name="invoiceNumber" defaultValue={purchase?.invoiceNumber} />
        <Input label="Reference # (optional)" name="referenceNumber" defaultValue={purchase?.referenceNumber} />
      </div>

      <Select label="Payment Status" name="paymentStatus" required options={STATUS_OPTIONS} defaultValue={purchase?.paymentStatus} placeholder="Choose a status" />

      <Input label="Notes (optional)" name="notes" defaultValue={purchase?.notes} />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </PersistForm>
  );
}
