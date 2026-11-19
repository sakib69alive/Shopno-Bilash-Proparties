"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { approveOwnershipTransfer, rejectOwnershipTransfer } from "@/features/ownership/transferActions";
import { setExpenseStatus } from "@/features/finance/expenseActions";
import { setContractorPaymentStatus } from "@/features/contractors/paymentActions";
import type { ApprovalQueueItem } from "@/features/approvals/queue";
import type { Project } from "@/types/project";

export interface ApprovalQueueExplorerProps {
  items: ApprovalQueueItem[];
  projects: Project[];
  canManage: boolean;
}

const TYPE_LABELS: Record<ApprovalQueueItem["type"], string> = {
  "ownership-transfer": "Ownership Transfer",
  "expense-verification": "Expense Verification",
  "contractor-payment-verification": "Payment Verification",
};

export function ApprovalQueueExplorer({ items, projects, canManage }: ApprovalQueueExplorerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  function handleApprove(item: ApprovalQueueItem) {
    startTransition(async () => {
      if (item.type === "ownership-transfer") await approveOwnershipTransfer(item.id);
      else if (item.type === "expense-verification") await setExpenseStatus(item.id, "verified");
      else await setContractorPaymentStatus(item.id, "verified");
      router.refresh();
    });
  }

  function handleReject(item: ApprovalQueueItem) {
    startTransition(async () => {
      if (item.type === "ownership-transfer") await rejectOwnershipTransfer(item.id);
      else if (item.type === "expense-verification") await setExpenseStatus(item.id, "rejected");
      else await setContractorPaymentStatus(item.id, "rejected");
      router.refresh();
    });
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => !query || item.title.toLowerCase().includes(query) || item.description.toLowerCase().includes(query));
  }, [items, search]);

  const columns: DataTableColumn<ApprovalQueueItem>[] = [
    {
      key: "title",
      header: "Item",
      render: (item) => (
        <Link href={item.href} className="text-fg hover:text-accent transition-colors">
          {item.title}
        </Link>
      ),
    },
    { key: "type", header: "Type", render: (item) => TYPE_LABELS[item.type] },
    { key: "project", header: "Project", render: (item) => (item.projectId ? (projectsById.get(item.projectId)?.name ?? "—") : "—") },
    { key: "requestedBy", header: "Requested By", render: (item) => item.requestedBy ?? "—" },
    { key: "requestedDate", header: "Requested", render: (item) => formatDate(new Date(item.requestedDate)) },
    { key: "priority", header: "Priority", render: (item) => <StatusBadge status={item.priority} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) =>
        canManage && (
          <span className="flex items-center justify-end gap-1">
            <IconButton icon={Check} label={adminCopy("Approve")} size="sm" disabled={isPending} onClick={() => handleApprove(item)} className="hover:text-success" />
            <IconButton icon={X} label={adminCopy("Reject")} size="sm" disabled={isPending} onClick={() => handleReject(item)} className="hover:text-error" />
          </span>
        ),
    },
  ];

  if (items.length === 0) {
    return <EmptyState title="Nothing pending approval" description="Ownership transfers, expenses, and payments awaiting review will appear here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search approvals"
          aria-label="Search approval queue"
          className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(item) => `${item.type}:${item.id}`}
        emptyTitle="No items match your search"
        emptyDescription="Try a different keyword."
      />
    </div>
  );
}
