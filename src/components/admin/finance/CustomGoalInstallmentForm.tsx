"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { confirmCustomGoalInstallment, previewCustomGoalInstallment } from "@/features/costAllocations/installmentActions";
import { formatBDT } from "@/lib/format";
import { suggestedInstallmentAmount, summarizeInstallmentAmounts, type CustomInstallmentInput, type InstallmentMember, type InstallmentSelection } from "@/lib/goalInstallmentAllocation";

type Preview = Extract<Awaited<ReturnType<typeof previewCustomGoalInstallment>>, { token: string }>;

function Totals({ budget, total, difference }: { budget: number | null; total: number | null; difference: number | null }) {
  return (
    <dl className="bg-surface grid gap-2 rounded-lg p-3 text-sm sm:grid-cols-3" aria-live="polite">
      <div><dt className="text-fg-muted">Available project budget</dt><dd className="font-medium">{budget === null ? "No project budget set" : formatBDT(budget, 2)}</dd></div>
      <div><dt className="text-fg-muted">Current allocation</dt><dd className="font-medium">{total === null ? "Check the amounts" : formatBDT(total, 2)}</dd></div>
      <div className={difference !== null && difference < 0 ? "text-error" : undefined}>
        <dt>{difference !== null && difference < 0 ? "Over budget" : "Budget remaining after comparison"}</dt>
        <dd className="font-medium">{difference === null ? "—" : formatBDT(Math.abs(difference), 2)}</dd>
      </div>
    </dl>
  );
}

export function CustomGoalInstallmentForm({ allocationId, members, budget, defaultDueDate }: {
  allocationId: string; members: InstallmentMember[]; budget: number | null; defaultDueDate: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [filter, setFilter] = useState("");
  const [flat, setFlat] = useState("");
  const [selection, setSelection] = useState<InstallmentSelection[]>([]);
  const [review, setReview] = useState<{ preview: Preview; input: CustomInstallmentInput }>();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const available = members.filter((member) => member.remaining > 0);
  const map = new Map(members.map((member) => [member.id, member]));
  const flats = [...new Map(available.flatMap((member) => member.flats).map((item) => [item.id, item])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const filtered = available.filter((member) =>
    (!flat || member.flats.some((item) => item.id === flat)) &&
    (!filter || [member.name, ...member.flats.map((item) => item.label)].some((label) => label.toLowerCase().includes(filter.trim().toLowerCase()))),
  );

  function addMembers(list: InstallmentMember[]) {
    setSelection((current) => {
      const next = [...current];
      for (const member of list) {
        const ids = flat ? [flat] : member.flats.map((item) => item.id);
        const index = next.findIndex((item) => item.contributionId === member.id);
        if (index === -1) {
          next.push({ contributionId: member.id, flatIds: ids, amount: suggestedInstallmentAmount(member, ids) });
        } else {
          const old = next[index];
          const combined = [...new Set([...old.flatIds, ...ids])];
          if (combined.length !== old.flatIds.length) {
            const amount = old.amount === suggestedInstallmentAmount(member, old.flatIds)
              ? suggestedInstallmentAmount(member, combined) : old.amount;
            next[index] = { ...old, flatIds: combined, amount };
          }
        }
      }
      return next;
    });
  }

  function preview() {
    const input = { label, dueDate, members: selection };
    setError("");
    setSaved("");
    startTransition(async () => {
      try {
        const result = await previewCustomGoalInstallment(allocationId, input);
        if (typeof result.token === "string") setReview({ input, preview: result });
        else setError(result.error ?? "Could not preview the installment.");
      } catch {
        setError("Could not preview the installment. Try again.");
      }
    });
  }

  function confirm() {
    if (!review) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await confirmCustomGoalInstallment(allocationId, review.input, review.preview.token);
        if (result.error) {
          setReview(undefined);
          setError(result.error);
          router.refresh();
          return;
        }
        setSaved(`${review.preview.label} was added to the installment plan.`);
        setReview(undefined);
        setSelection([]);
        setLabel("");
        router.refresh();
      } catch {
        setError("Could not confirm the installment. Check the plan before trying again.");
      }
    });
  }

  const summary = summarizeInstallmentAmounts(selection, budget);
  return (
    <div className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h3 className="text-h4">Custom installment</h3>
        <p className="text-body-sm text-fg-muted mt-1">Choose who pays this installment and adjust each amount. Payments stay on the owner&apos;s account.</p>
      </div>
      {saved && <p role="status" className="text-success text-sm">{saved}</p>}
      {error && <p role="alert" className="bg-error-soft text-error rounded-md p-3 text-sm">{error}</p>}
      {review ? (
        <>
          <div><h4 className="font-medium">Review {review.preview.label}</h4><p className="text-fg-muted text-sm"><AdminText>{"Due "}</AdminText>{review.preview.dueDate}</p></div>
          <ul className="divide-border divide-y">
            {review.preview.members.map((member) => (
              <li key={member.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>{map.get(member.id)?.name ?? "Member"}<span className="text-fg-muted block text-xs">{member.flats.map((item) => item.label).join(", ") || "No flat linked"}</span></span>
                <span>{formatBDT(member.amount, 2)}{member.amount === 0 ? " · no charge" : ""}</span>
              </li>
            ))}
          </ul>
          <Totals {...review.preview} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setReview(undefined)}><AdminText>{"Edit allocation"}</AdminText></Button>
            <Button type="button" loading={pending} onClick={confirm}>{review.preview.difference !== null && review.preview.difference < 0 ? "Confirm over-budget installment" : "Confirm installment"}</Button>
          </div>
        </>
      ) : available.length ? (
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Installment name" maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} />
            <Input label="Installment due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <Input label="Find a member or flat" type="search" value={filter} onChange={(event) => setFilter(event.target.value)} />
            <Select label="Filter by flat" value={flat} options={[{ value: "", label: "All flats" }, ...flats.map((item) => ({ value: item.id, label: item.label }))]} onChange={(event) => setFlat(event.target.value)} />
          </div>
          {!!filtered.length && <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => addMembers(filtered)}><AdminText>{"Add "}</AdminText>{flat ? "members for this flat" : "matching members"} ({filtered.length})</Button>}
          <ul aria-label="Eligible members" className="border-border divide-border max-h-56 divide-y overflow-y-auto rounded-md border">
            {filtered.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                <span>{member.name}<span className="text-fg-muted block text-xs">{member.flats.map((item) => item.label).join(", ") || "No flat linked"}</span></span>
                <Button type="button" size="sm" variant="outline" onClick={() => addMembers([member])}><AdminText>{"Add "}</AdminText>{member.name}</Button>
              </li>
            ))}
            {!filtered.length && <li className="text-fg-muted p-3 text-sm">No members match this filter.</li>}
          </ul>
          {!!selection.length && <ul aria-label="Selected members" className="divide-border divide-y">
            {selection.map((item) => {
              const member = map.get(item.contributionId);
              return (
                <li key={item.contributionId} className="grid items-end gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
                  <div className="text-sm">
                    <p className="font-medium">{member?.name ?? "Member"}</p>
                    <p className="text-fg-muted text-xs">{member?.flats.filter((entry) => item.flatIds.includes(entry.id)).map((entry) => entry.label).join(", ") || "No flat linked"}</p>
                    <p className="text-fg-muted text-xs">{formatBDT(member?.remaining ?? 0, 2)} unscheduled · Suggested {member ? formatBDT(Number(suggestedInstallmentAmount(member, item.flatIds)), 2) : "—"}</p>
                  </div>
                  <Input label={`Amount for ${member?.name ?? "member"}`} inputMode="decimal" value={item.amount} onChange={(event) => {
                    const amount = event.target.value;
                    setSelection((current) => current.map((entry) => entry.contributionId === item.contributionId ? { ...entry, amount } : entry));
                  }} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelection((current) => current.filter((entry) => entry.contributionId !== item.contributionId))}><AdminText>{"Remove "}</AdminText>{member?.name}</Button>
                </li>
              );
            })}
          </ul>}
          <Totals budget={budget} {...summary} />
          <p className="text-fg-muted text-xs">Budget available means the saved project budget minus recognized costs. Installment collections do not change that budget.</p>
          <Button type="button" className="self-start" loading={pending} disabled={!label.trim() || !dueDate || !summary.total} onClick={preview}>Preview installment</Button>
        </fieldset>
      ) : <p className="text-body-sm text-fg-muted">No members have an unscheduled balance on this goal.</p>}
    </div>
  );
}
