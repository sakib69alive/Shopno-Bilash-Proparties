"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Document, DocumentOwnerType } from "@/types/document";
import type { DocumentFormState } from "@/features/documents/actions";

export interface DocumentFormProps {
  action: (state: DocumentFormState, formData: FormData) => Promise<DocumentFormState>;
  document?: Document;
  submitLabel: string;
  /** Presets & locks Owner Type/ID when arriving from that record's own page (e.g. a Unit's Documents tab). */
  defaultOwnerType?: DocumentOwnerType;
  defaultOwnerId?: string;
  /** Named people to pick from instead of typing an id: customers, shareholders, landowners. */
  people?: { customer?: { value: string; label: string }[]; shareholder?: { value: string; label: string }[]; landowner?: { value: string; label: string }[] };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const OWNER_TYPE_OPTIONS: { value: DocumentOwnerType; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "project", label: "Project" },
  { value: "unit", label: "Unit" },
  { value: "customer", label: "Customer" },
  { value: "shareholder", label: "Shareholder" },
  { value: "landowner", label: "Landowner" },
  { value: "vendor", label: "Vendor" },
  { value: "transaction", label: "Transaction" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Show to the client in their portal" },
  { value: "internal", label: "Staff only — the client does not see it" },
  { value: "restricted", label: "Restricted — senior staff only" },
  { value: "public", label: "Public — also usable on the website" },
];

/**
 * `ownerId` is a plain text field, not a dropdown — `ownerType` is
 * polymorphic (Project, Unit, Customer, Shareholder, Landowner, Vendor,
 * Company, Transaction) and building eight conditional dropdowns for one
 * field isn't worth it yet; copy the id from that record's own admin page.
 * The file input is a real upload (`src/lib/fileStorage.ts` writes it to
 * `public/uploads/documents/`) — required on create, optional on edit
 * (leave empty to keep the existing file).
 */
export function DocumentForm({ action, document, submitLabel, defaultOwnerType, defaultOwnerId, people = {} }: DocumentFormProps) {
  const [state, formAction] = useActionState(action, {});
  const [ownerType, setOwnerType] = useState<string>(document?.ownerType ?? defaultOwnerType ?? "");
  const personOptions = (people as Record<string, { value: string; label: string }[] | undefined>)[ownerType];
  const ownerLocked = !document && !!defaultOwnerType && !!defaultOwnerId;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      <Input label="Name" name="name" required defaultValue={document?.name} placeholder="e.g. Sale Agreement — Unit A-502" />

      <Input label="Category" name="category" required defaultValue={document?.category} placeholder="e.g. Contract, NID, Deed" />

      {ownerLocked ? (
        <input type="hidden" name="ownerType" value={defaultOwnerType} />
      ) : null}
      {ownerLocked ? (
        <input type="hidden" name="ownerId" value={defaultOwnerId} />
      ) : null}
      {ownerLocked ? (
        <p className="text-body-sm text-fg-muted">
          Attaching to: <span className="text-fg font-medium">{OWNER_TYPE_OPTIONS.find((o) => o.value === defaultOwnerType)?.label}</span>{" "}
          ({defaultOwnerId})
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Owner Type"
            name="ownerType"
            required
            options={OWNER_TYPE_OPTIONS}
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value)}
            placeholder="Choose an owner type"
          />
          {personOptions && personOptions.length > 0 ? (
            <Select
              key={ownerType}
              label={ownerType === "customer" ? "Customer" : ownerType === "shareholder" ? "Shareholder" : "Landowner"}
              name="ownerId"
              required
              options={personOptions}
              defaultValue={document?.ownerType === ownerType ? document.ownerId : defaultOwnerId}
              placeholder="Choose who this is for"
            />
          ) : (
            <Input
              label="Owner ID"
              name="ownerId"
              required
              defaultValue={document?.ownerId ?? defaultOwnerId}
              placeholder="Copy the id from that record's page"
            />
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Status" name="status" required options={STATUS_OPTIONS} defaultValue={document?.status} placeholder="Choose a status" />
        <Select label="Visibility" name="visibility" required options={VISIBILITY_OPTIONS} defaultValue={document?.visibility ?? "private"} placeholder="Choose a visibility" />
      </div>

      <Input
        label={document ? "Replace File (optional)" : "File"}
        name="file"
        type="file"
        required={!document}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        helperText={
          document
            ? `Currently: ${document.fileUrl.split("/").pop()} — leave empty to keep it.`
            : "PDF, JPG, PNG, WEBP, DOC or DOCX, up to 15MB. The client opens or downloads it from Documents in their portal."
        }
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
