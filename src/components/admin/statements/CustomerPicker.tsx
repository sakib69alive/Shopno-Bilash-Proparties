"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { bdWhatsAppNumber } from "@/lib/contactLinks";

export interface PickRecipient {
  id: string;
  name: string;
  phone?: string;
  projectIds?: string[];
}

/** Choose customers: by project, by searching a name or phone, one by one or "select all shown". Used to send a notice or a file to many people. */
export function CustomerPicker({
  recipients,
  projects,
  picked,
  onPicked,
  done,
  showPhone = true,
}: {
  recipients: PickRecipient[];
  projects: { value: string; label: string }[];
  picked: Set<string>;
  onPicked: (next: Set<string>) => void;
  /** People already handled (shown with a tick). */
  done?: Set<string>;
  showPhone?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () => recipients.filter((r) => (!projectId || (r.projectIds ?? []).includes(projectId)) && (!q || r.name.toLowerCase().includes(q) || (r.phone ?? "").includes(q))),
    [recipients, q, projectId],
  );
  const count = recipients.filter((r) => picked.has(r.id)).length;

  function toggle(id: string) {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    onPicked(n);
  }

  return (
    <>
      {projects.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-caption text-fg-subtle">Customers of which project?</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="text-body-sm border-border-strong bg-surface text-fg focus:border-accent h-10 w-full rounded-md border px-3 outline-none"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="relative">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={showPhone ? "Search a name or phone" : "Search a name"}
          aria-label="Search customers"
          className="text-body-sm border-border-strong bg-surface text-fg focus:border-accent h-10 w-full rounded-md border pr-3 pl-9 outline-none"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-fg-subtle">{count} chosen</p>
        <div className="flex gap-3">
          <button type="button" className="text-caption text-accent font-medium" onClick={() => onPicked(new Set([...picked, ...shown.map((r) => r.id)]))}>
            Select all{q || projectId ? " shown" : ""}
          </button>
          <button type="button" className="text-caption text-fg-subtle" onClick={() => onPicked(new Set())}>
            Clear
          </button>
        </div>
      </div>

      <ul className="thin-scrollbar border-border divide-border max-h-60 divide-y overflow-y-auto rounded-lg border">
        {shown.length === 0 && <li className="text-body-sm text-fg-subtle p-3">{projectId ? "No customer has a flat in this project yet." : "No customer matches."}</li>}
        {shown.map((r) => {
          const on = picked.has(r.id);
          return (
            <li key={r.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", on && "bg-accent-soft")}>
                <input type="checkbox" checked={on} onChange={() => toggle(r.id)} className="accent-accent size-4" />
                <span className="min-w-0 flex-1">
                  <span className="text-body-sm text-fg block truncate font-medium">{r.name}</span>
                  {showPhone && <span className="text-caption text-fg-subtle block">{bdWhatsAppNumber(r.phone) ? r.phone : "No phone number"}</span>}
                </span>
                {done?.has(r.id) && <Check aria-label="Done" className="text-success size-4" />}
              </label>
            </li>
          );
        })}
      </ul>
    </>
  );
}
