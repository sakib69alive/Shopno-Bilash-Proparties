"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDate } from "@/lib/format";
import { recordActivity, type ActivityLogFormState } from "@/features/construction/activityActions";
import type { ConstructionActivityLog } from "@/types/construction";
import type { Contractor } from "@/types/contractor";

export interface ActivityLogPanelProps {
  projectId: string;
  phaseId?: string;
  entries: ConstructionActivityLog[];
  contractors: Contractor[];
  canManage: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Record Update
    </Button>
  );
}

/** A chronological journal — never mutates any stage's stored progress on its own, see `recordActivity`'s own doc comment. */
export function ActivityLogPanel({ projectId, phaseId, entries, contractors, canManage }: ActivityLogPanelProps) {
  const [state, formAction] = useActionState<ActivityLogFormState, FormData>(recordActivity, {});
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const contractorsById = new Map(contractors.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <PersistForm state={state} action={formAction} className="border-border flex flex-col gap-3 rounded-md border p-3">
          {state.error && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-caption">{state.error}</p>
            </div>
          )}
          <input type="hidden" name="projectId" value={projectId} />
          {phaseId && <input type="hidden" name="phaseId" value={phaseId} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Date" name="date" type="date" required />
            <Select
              label="Contractor (optional)"
              name="contractorId"
              options={contractors.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Not specified"
            />
          </div>
          <Input label="Activity" name="activity" required placeholder="e.g. Pile casting completed for Zone A" />
          <Input label="Notes (optional)" name="notes" />
          <div>
            <SubmitButton />
          </div>
        </PersistForm>
      )}

      {sorted.length === 0 ? (
        <EmptyState title="No construction activity recorded yet" description="Site updates recorded here build a chronological construction history." />
      ) : (
        <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
          {sorted.map((entry) => (
            <div key={entry.id} className="border-border flex flex-col gap-1 border-b p-3 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-sm text-fg font-medium">{entry.activity}</p>
                <p className="text-caption text-fg-subtle whitespace-nowrap">{formatDate(new Date(entry.date))}</p>
              </div>
              {(entry.contractorId || entry.notes) && (
                <p className="text-caption text-fg-subtle">
                  {entry.contractorId && `${contractorsById.get(entry.contractorId)?.name ?? "Unknown contractor"}`}
                  {entry.contractorId && entry.notes && " · "}
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
