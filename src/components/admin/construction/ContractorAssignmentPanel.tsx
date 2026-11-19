"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { assignContractor, unassignContractor } from "@/features/contractors/assignmentActions";
import type { Contractor, ContractorAssignment } from "@/types/contractor";

export interface ContractorAssignmentPanelProps {
  phaseId: string;
  currentContractorId?: string;
  contractors: Contractor[];
  /** This phase's full assignment history, any order — sorted here by assignedDate desc. */
  history: ContractorAssignment[];
}

/** Assigning a different contractor closes the open history span and opens a new one — see `assignContractor`'s own doc comment. Nothing is ever silently overwritten. */
export function ContractorAssignmentPanel({ phaseId, currentContractorId, contractors, history }: ContractorAssignmentPanelProps) {
  const [selected, setSelected] = useState(currentContractorId ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const contractorsById = new Map(contractors.map((c) => [c.id, c]));
  const sortedHistory = [...history].sort((a, b) => b.assignedDate.localeCompare(a.assignedDate));

  function handleChange(value: string) {
    setSelected(value);
    startTransition(async () => {
      const result = value ? await assignContractor({ phaseId }, value) : await unassignContractor({ phaseId });
      if (result.error) window.alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="text-body-sm h-10 w-full max-w-xs rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none focus:border-accent"
      >
        <option value=""><AdminText>{"Not assigned"}</AdminText></option>
        {contractors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {sortedHistory.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-fg-subtle uppercase"><AdminText>{"History"}</AdminText></p>
          {sortedHistory.map((a) => (
            <p key={a.id} className="text-caption text-fg-subtle">
              <Link href={`/admin/construction/contractors/${a.contractorId}`} className="text-fg hover:text-accent transition-colors">
                {contractorsById.get(a.contractorId)?.name ?? "Unknown contractor"}
              </Link>{" "}
              — {formatDate(new Date(a.assignedDate))} <AdminText>{"to"}</AdminText> {a.unassignedDate ? formatDate(new Date(a.unassignedDate)) : "present"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
