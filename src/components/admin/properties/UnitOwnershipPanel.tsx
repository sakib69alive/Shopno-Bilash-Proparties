"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { unassignUnitFromShareholding } from "@/features/shareholders/shareholdingActions";
import { deleteLandownerAllocationByUnit } from "@/features/landowners/landownerAllocationActions";
import { approveOwnershipTransfer, rejectOwnershipTransfer } from "@/features/ownership/transferActions";
import { AssignOwnerDrawer, type LandownerOption, type ShareholderOption } from "./AssignOwnerDrawer";
import { OwnershipTransferForm } from "./OwnershipTransferForm";
import type { OwnerType } from "@/types/finance/costAllocation";
import type { ObligationHandling, OwnershipTransferStatus } from "@/types/ownership";

export interface CurrentOwnerInfo {
  ownerType: OwnerType;
  label: string;
  href?: string;
  saleHref?: string;
  shareholderId?: string;
  shareholdingId?: string;
  landownerId?: string;
}

export interface HistoryRow {
  id: string;
  ownerLabel: string;
  ownerHref?: string;
  source: string;
  startDate: string;
  endDate?: string;
}

export interface PendingTransferRow {
  id: string;
  newOwnerLabel: string;
  date: string;
  reason: string;
  obligationHandling: ObligationHandling;
  status: OwnershipTransferStatus;
}

export interface UnitOwnershipPanelProps {
  unitId: string;
  currentOwner?: CurrentOwnerInfo;
  history: HistoryRow[];
  shareholderOptions: ShareholderOption[];
  landownerOptions: LandownerOption[];
  customerOptions: { value: string; label: string }[];
  pendingTransfers: PendingTransferRow[];
  canManage: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  sale: "Sale",
  shareholding: "Shareholder assignment",
  "landowner-allocation": "Landowner allocation",
  transfer: "Ownership Transfer",
  manual: "Manual",
};

const OBLIGATION_LABELS: Record<ObligationHandling, string> = {
  "previous-pays": "Previous owner pays",
  "new-assumes": "New owner assumes",
  split: "Split between both",
  waived: "Waived",
  adjusted: "Adjusted",
  other: "Other",
};

export function UnitOwnershipPanel({
  unitId,
  currentOwner,
  history,
  shareholderOptions,
  landownerOptions,
  customerOptions,
  pendingTransfers,
  canManage,
}: UnitOwnershipPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove(transferId: string) {
    startTransition(async () => {
      await approveOwnershipTransfer(transferId);
      router.refresh();
    });
  }

  function handleReject(transferId: string) {
    startTransition(async () => {
      await rejectOwnershipTransfer(transferId);
      router.refresh();
    });
  }

  function handleRelease() {
    if (!currentOwner) return;
    if (!window.confirm("Release this unit's owner? It will become available again.")) return;
    startTransition(async () => {
      if (currentOwner.ownerType === "shareholder" && currentOwner.shareholderId && currentOwner.shareholdingId) {
        await unassignUnitFromShareholding(currentOwner.shareholderId, currentOwner.shareholdingId, unitId);
      } else if (currentOwner.ownerType === "landowner" && currentOwner.landownerId) {
        await deleteLandownerAllocationByUnit(currentOwner.landownerId, unitId);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {currentOwner ? (
        <div className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-caption text-fg-subtle uppercase">Current Owner</p>
            {currentOwner.href ? (
              <Link href={currentOwner.href} className="text-body text-fg hover:text-accent font-medium transition-colors">
                {currentOwner.label}
              </Link>
            ) : (
              <p className="text-body text-fg font-medium">{currentOwner.label}</p>
            )}
            <p className="text-caption text-fg-subtle capitalize">{currentOwner.ownerType}</p>
          </div>
          <div className="flex items-center gap-2">
            {currentOwner.ownerType === "customer" && (
              <Link href={currentOwner.saleHref ?? "/admin/sales"} className="text-body-sm text-accent hover:underline">
                Manage via Sales →
              </Link>
            )}
            {currentOwner.ownerType !== "customer" && (
              <Button variant="outline" size="sm" onClick={handleRelease} loading={isPending} className="hover:text-error">
                <AdminText>{"Release"}</AdminText>
              </Button>
            )}
            {canManage && customerOptions.length > 0 && (
              <OwnershipTransferForm unitId={unitId} currentOwnerLabel={currentOwner.label} customerOptions={customerOptions} />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={UserX}
          title="Available — no owner assigned"
          description="Assign this unit to a customer, shareholder, or landowner."
          action={
            <Button size="md" onClick={() => setDrawerOpen(true)}>
              <AdminText>{"Assign Owner"}</AdminText>
            </Button>
          }
        />
      )}

      {pendingTransfers.length > 0 && (
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Pending Transfers</h2>
          <div className="flex flex-col gap-2">
            {pendingTransfers.map((t) => (
              <div key={t.id} className="border-border bg-surface-raised flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-body-sm text-fg"><AdminText>{"To"}</AdminText> {t.newOwnerLabel}</p>
                  <p className="text-caption text-fg-subtle">
                    {t.date.slice(0, 10)} · {t.reason} · {OBLIGATION_LABELS[t.obligationHandling]}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" onClick={() => handleApprove(t.id)} loading={isPending}>
                      <AdminText>{"Approve"}</AdminText>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleReject(t.id)} loading={isPending} className="hover:text-error">
                      <AdminText>{"Reject"}</AdminText>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-label text-fg-subtle mb-3 uppercase">Ownership History</h2>
        {history.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">No ownership changes recorded for this unit yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((row) => (
              <div key={row.id} className="border-border flex items-center justify-between border-b py-2.5 last:border-b-0">
                <div>
                  {row.ownerHref ? (
                    <Link href={row.ownerHref} className="text-body-sm text-fg hover:text-accent transition-colors">
                      {row.ownerLabel}
                    </Link>
                  ) : (
                    <p className="text-body-sm text-fg">{row.ownerLabel}</p>
                  )}
                  <p className="text-caption text-fg-subtle">{SOURCE_LABELS[row.source] ?? row.source}</p>
                </div>
                <p className="text-caption text-fg-subtle">
                  {row.startDate.slice(0, 10)} — {row.endDate ? row.endDate.slice(0, 10) : "present"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <AssignOwnerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        unitId={unitId}
        shareholderOptions={shareholderOptions}
        landownerOptions={landownerOptions}
      />
    </div>
  );
}
