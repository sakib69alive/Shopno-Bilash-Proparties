"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Tabs } from "@/components/ui/Tabs";
import { Select } from "@/components/ui/Select";
import { Button, buttonVariants } from "@/components/ui/Button";
import { assignUnitToShareholding } from "@/features/shareholders/shareholdingActions";
import { createLandownerAllocation } from "@/features/landowners/landownerAllocationActions";

export interface ShareholderOption {
  shareholderId: string;
  shareholdingId: string;
  name: string;
}

export interface LandownerOption {
  landownerId: string;
  agreementId: string;
  name: string;
}

export interface AssignOwnerDrawerProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  shareholderOptions: ShareholderOption[];
  landownerOptions: LandownerOption[];
}

const PATHS = [
  { value: "sale", label: "Sale" },
  { value: "shareholder", label: "Shareholder" },
  { value: "landowner", label: "Landowner" },
];

/**
 * Three assignment paths, deliberately not one uniform picker: a Sale is a
 * real financial transaction with its own required fields (price, date),
 * so it link-outs to Sales' own creation flow rather than a shortcut here;
 * Shareholder/Landowner assignment are pre-existing, already-safe
 * lightweight link-toggle actions, so they get an inline picker calling
 * the existing `assignUnitToShareholding`/`createLandownerAllocation`
 * directly.
 */
export function AssignOwnerDrawer({ open, onClose, unitId, shareholderOptions, landownerOptions }: AssignOwnerDrawerProps) {
  const { t: adminCopy } = useUiLanguage();
  const [path, setPath] = useState<string>("sale");
  const [selectedShareholding, setSelectedShareholding] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAssignShareholder() {
    const option = shareholderOptions.find((o) => o.shareholdingId === selectedShareholding);
    if (!option) return;
    setError(undefined);
    startTransition(async () => {
      const result = await assignUnitToShareholding(option.shareholderId, option.shareholdingId, unitId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  function handleAssignLandowner() {
    const option = landownerOptions.find((o) => o.agreementId === selectedAgreement);
    if (!option) return;
    setError(undefined);
    startTransition(async () => {
      const result = await createLandownerAllocation(option.landownerId, option.agreementId, unitId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" title={adminCopy("Assign Owner")}>
      <div className="flex flex-col gap-5 p-5">
        <Tabs items={PATHS} value={path} onChange={setPath} />

        {error && <p className="text-body-sm text-error">{error}</p>}

        {path === "sale" && (
          <div className="flex flex-col gap-3">
            <p className="text-body-sm text-fg-muted">
              A customer sale is a real financial transaction (price, date) — record it through the Sales module.
            </p>
            <Link href={`/admin/sales/new?unitId=${unitId}`} className={buttonVariants({ size: "md" })}>
              <AdminText>{"Record a Sale"}</AdminText>
            </Link>
          </div>
        )}

        {path === "shareholder" && (
          <div className="flex flex-col gap-3">
            {shareholderOptions.length === 0 ? (
              <p className="text-body-sm text-fg-subtle">No shareholders hold a stake in this project yet.</p>
            ) : (
              <>
                <Select
                  label="Shareholder"
                  options={shareholderOptions.map((o) => ({ value: o.shareholdingId, label: o.name }))}
                  value={selectedShareholding}
                  onChange={(e) => setSelectedShareholding(e.target.value)}
                  placeholder="Choose a shareholder"
                />
                <Button onClick={handleAssignShareholder} loading={isPending} disabled={!selectedShareholding}>
                  <AdminText>{"Assign"}</AdminText>
                </Button>
              </>
            )}
          </div>
        )}

        {path === "landowner" && (
          <div className="flex flex-col gap-3">
            {landownerOptions.length === 0 ? (
              <p className="text-body-sm text-fg-subtle">No landowners have an agreement for this project yet.</p>
            ) : (
              <>
                <Select
                  label="Landowner"
                  options={landownerOptions.map((o) => ({ value: o.agreementId, label: o.name }))}
                  value={selectedAgreement}
                  onChange={(e) => setSelectedAgreement(e.target.value)}
                  placeholder="Choose a landowner"
                />
                <Button onClick={handleAssignLandowner} loading={isPending} disabled={!selectedAgreement}>
                  <AdminText>{"Assign"}</AdminText>
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
