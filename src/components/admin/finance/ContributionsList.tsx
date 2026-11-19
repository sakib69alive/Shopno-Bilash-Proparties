"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { ContributionPaymentForm, type InstallmentOption } from "@/components/admin/finance/ContributionPaymentForm";
import { ContributionAdjustmentForm } from "@/components/admin/finance/ContributionAdjustmentForm";
import { formatBDT, formatDate } from "@/lib/format";
import type { ContributionStatus } from "@/lib/contributionStatus";
import type { ContributionAdjustment, OwnerType } from "@/types/finance/costAllocation";
import { ExplainFinanceButton } from "./FinanceAssistant";

export interface ContributionRow {
  contributionId: string;
  ownerType: OwnerType;
  ownerName: string;
  ownerHref?: string;
  units: string[]; // unit numbers
  unitBreakdown: { unitNumber: string; payableAmount: number }[];
  sizeSqft: number;
  shareRatio: number;
  payableAmount: number;
  paidAmount: number;
  effectivePayable: number;
  outstanding: number;
  fineAmount: number;
  totalDue: number;
  status: ContributionStatus;
  dueDate: string;
  adjustments: ContributionAdjustment[];
  installmentOptions?: InstallmentOption[];
}

export interface ContributionsListProps {
  costAllocationId: string;
  rows: ContributionRow[];
  canManage: boolean;
  boundPaymentAction: (state: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
}

const STATUS_OPTIONS: { value: ContributionStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "partially-paid", label: "Partially Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

/** "Who hasn't paid" filter — client-side over this one allocation's already-loaded contributions, the established Explorer-filter pattern used everywhere else in this admin panel. */
export function ContributionsList({ costAllocationId, rows, canManage, boundPaymentAction }: ContributionsListProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContributionStatus | "all">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "all" || row.status === status;
      const matchesSearch = !query || row.ownerName.toLowerCase().includes(query) || row.units.some((u) => u.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [rows, search, status]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by owner or unit"
            aria-label="Search contributions"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ContributionStatus | "all")}
          aria-label={adminCopy("Filter by status")}
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-body-sm text-fg-subtle">No contributions match your search.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((row) => (
            <div key={row.contributionId} className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {row.ownerHref ? (
                    <Link href={row.ownerHref} className="text-body-sm text-fg font-medium hover:text-accent transition-colors">
                      {row.ownerName}
                    </Link>
                  ) : (
                    <p className="text-body-sm text-fg font-medium">{row.ownerName}</p>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <p className="text-caption text-fg-subtle capitalize">{row.ownerType}</p>
                    <ExplainFinanceButton selection={{ kind: "member", id: row.contributionId }} label="Explain member balance" />
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fact label="Units" value={row.units.join(", ") || "—"} />
                <Fact label="Sqft / Ratio" value={`${row.sizeSqft.toLocaleString()} (${(row.shareRatio * 100).toFixed(1)}%)`} />
                <Fact label="Payable" value={formatBDT(row.payableAmount)} />
                <Fact label="Paid" value={formatBDT(row.paidAmount)} />
                <Fact label="Outstanding" value={formatBDT(row.outstanding)} />
                {row.fineAmount > 0 && <Fact label="Fine" value={formatBDT(row.fineAmount)} />}
                <Fact label="Total Due" value={formatBDT(row.totalDue)} />
                <Fact label="Due Date" value={formatDate(new Date(row.dueDate))} />
              </div>

              {row.unitBreakdown.length > 1 && (
                <div className="border-border border-t pt-3">
                  <p className="text-caption text-fg-subtle mb-1.5 uppercase">Unit Breakdown</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {row.unitBreakdown.map((u) => (
                      <p key={u.unitNumber} className="text-body-sm text-fg-muted">
                        {u.unitNumber} → {formatBDT(u.payableAmount)}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {row.adjustments.length > 0 && (
                <div className="border-border border-t pt-3">
                  <p className="text-caption text-fg-subtle mb-1.5 uppercase"><AdminText>{"Adjustments"}</AdminText></p>
                  <div className="flex flex-col gap-1">
                    {row.adjustments.map((a) => (
                      <p key={a.id} className="text-body-sm text-fg-muted">
                        <span className="capitalize">{a.type}</span>: {formatBDT(a.amount.amount)} — {a.reason}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  {row.outstanding > 0 && (
                    <ContributionPaymentForm
                      action={boundPaymentAction}
                      contributionId={row.contributionId}
                      maxAmount={row.outstanding}
                      installmentOptions={row.installmentOptions}
                    />
                  )}
                  <ContributionAdjustmentForm costAllocationId={costAllocationId} contributionId={row.contributionId} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}
