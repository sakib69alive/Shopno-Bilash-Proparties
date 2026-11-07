"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { reviseSchedule, type ScheduleRevisionFormState } from "@/features/construction/scheduleActions";
import type { ScheduleRevision } from "@/types/construction";

export interface ScheduleRevisionPanelProps {
  targetType: "phase" | "task";
  targetId: string;
  currentTargetDate?: string;
  /** Every past revision for this phase/task, any order — sorted here by changedAt desc. */
  history: ScheduleRevision[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Revise
    </Button>
  );
}

/** The one path that ever changes a target date after creation — every change is permanently logged (`reviseSchedule`'s own doc comment), original dates never silently lost. */
export function ScheduleRevisionPanel({ targetType, targetId, currentTargetDate, history }: ScheduleRevisionPanelProps) {
  const [open, setOpen] = useState(false);
  const boundAction = reviseSchedule.bind(null, targetType, targetId);
  const [state, formAction] = useActionState<ScheduleRevisionFormState, FormData>(boundAction, {});
  const sortedHistory = [...history].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-body-sm text-accent flex items-center gap-1 self-start">
        Revise Schedule
        <ChevronDown aria-hidden className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <PersistForm state={state} action={formAction} className="border-border flex flex-col gap-3 rounded-md border p-3">
          {state.error && (
            <div role="alert" className="bg-error-soft text-error flex items-start gap-2 rounded-md px-3 py-2">
              <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              <p className="text-caption">{state.error}</p>
            </div>
          )}
          <p className="text-caption text-fg-subtle">Current target: {currentTargetDate ? formatDate(new Date(currentTargetDate)) : "not set"}</p>
          <Input label="New Target Date" name="newTargetDate" type="date" required />
          <Input label="Reason" name="reason" required placeholder="e.g. Delayed by weather" />
          <div>
            <SubmitButton />
          </div>
        </PersistForm>
      )}

      {sortedHistory.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-fg-subtle uppercase">Revision History</p>
          {sortedHistory.map((r) => (
            <p key={r.id} className="text-caption text-fg-subtle">
              {formatDate(new Date(r.previousTargetDate))} → {formatDate(new Date(r.newTargetDate))} — {r.reason} ({formatDate(new Date(r.createdAt))})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
