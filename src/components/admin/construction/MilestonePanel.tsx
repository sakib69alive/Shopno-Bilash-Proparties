"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDate } from "@/lib/format";
import { createMilestone, completeMilestone, deleteMilestone, type MilestoneFormState } from "@/features/construction/milestoneActions";
import type { Milestone, ConstructionPhase } from "@/types/construction";

export interface MilestonePanelProps {
  projectId: string;
  milestones: Milestone[];
  phases: ConstructionPhase[];
  canManage: boolean;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Add Milestone
    </Button>
  );
}

/** Important, dated construction events — visible independent of any one phase reaching 100% (§14). */
export function MilestonePanel({ projectId, milestones, phases, canManage }: MilestonePanelProps) {
  const [state, formAction] = useActionState<MilestoneFormState, FormData>(createMilestone, {});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const phasesById = new Map(phases.map((p) => [p.id, p]));
  const sorted = [...milestones].sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""));

  function handleComplete(id: string) {
    startTransition(async () => {
      const result = await completeMilestone(id);
      if (result.error) window.alert(result.error);
      router.refresh();
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete milestone "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteMilestone(id);
      if (result.error) window.alert(result.error);
      router.refresh();
    });
  }

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
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Milestone Name" name="name" required placeholder="e.g. Piling Complete" />
            <Input label="Target Date (optional)" name="targetDate" type="date" />
          </div>
          <Select
            label="Related Phase (optional)"
            name="relatedPhaseId"
            options={phases.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Not linked to a phase"
          />
          <Input label="Notes (optional)" name="notes" />
          <div>
            <SubmitButton />
          </div>
        </PersistForm>
      )}

      {sorted.length === 0 ? (
        <EmptyState title="No milestones configured yet" description="Important construction milestones will appear here." />
      ) : (
        <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
          {sorted.map((m) => (
            <div key={m.id} className="border-border flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
              <div className="flex items-center gap-2.5">
                {m.status === "completed" ? (
                  <CheckCircle2 aria-hidden className="text-success size-4 shrink-0" />
                ) : (
                  <Circle aria-hidden className="text-fg-subtle size-4 shrink-0" />
                )}
                <div>
                  <p className="text-body-sm text-fg font-medium">{m.name}</p>
                  <p className="text-caption text-fg-subtle mt-0.5">
                    {m.relatedPhaseId && phasesById.get(m.relatedPhaseId) ? `${phasesById.get(m.relatedPhaseId)!.name} · ` : ""}
                    {m.status === "completed" && m.completedDate
                      ? `Completed ${formatDate(new Date(m.completedDate))}`
                      : m.targetDate
                        ? `Target ${formatDate(new Date(m.targetDate))}`
                        : "No target date"}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  {m.status !== "completed" && (
                    <Button variant="outline" size="sm" onClick={() => handleComplete(m.id)} loading={isPending}>
                      Complete
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id, m.name)}
                    className="text-caption text-fg-subtle hover:text-error px-2"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
