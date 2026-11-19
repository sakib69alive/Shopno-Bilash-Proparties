"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { assignParkingToOwner } from "@/features/parking/actions";
import type { Customer } from "@/types/customer";

export interface OwnerOption {
  id: string;
  name: string;
}

export interface AssignParkingDrawerProps {
  open: boolean;
  onClose: () => void;
  parkingId: string;
  customers: Customer[];
  shareholderOptions: OwnerOption[];
  landownerOptions: OwnerOption[];
}

const OWNER_TYPES = [
  { value: "customer", label: "Customer" },
  { value: "shareholder", label: "Shareholder" },
  { value: "landowner", label: "Landowner" },
];

/** Parking assignment has no backing transaction (unlike a Unit sale) — a direct, single picker suffices for all three owner types. */
export function AssignParkingDrawer({ open, onClose, parkingId, customers, shareholderOptions, landownerOptions }: AssignParkingDrawerProps) {
  const [ownerType, setOwnerType] = useState("customer");
  const [ownerId, setOwnerId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const options = ownerType === "customer" ? customers.map((c) => ({ id: c.id, name: c.name })) : ownerType === "shareholder" ? shareholderOptions : landownerOptions;

  function handleAssign() {
    if (!ownerId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await assignParkingToOwner(parkingId, ownerType, ownerId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" title="Assign Parking">
      <div className="flex flex-col gap-5 p-5">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <Select
          label="Owner Type"
          options={OWNER_TYPES}
          value={ownerType}
          onChange={(e) => {
            setOwnerType(e.target.value);
            setOwnerId("");
          }}
        />
        {options.length === 0 ? (
          <p className="text-body-sm text-fg-subtle"><AdminText>{"No "}</AdminText>{ownerType}s available to assign.</p>
        ) : (
          <Select
            label={OWNER_TYPES.find((o) => o.value === ownerType)?.label ?? "Owner"}
            options={options.map((o) => ({ value: o.id, label: o.name }))}
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            placeholder="Choose an owner"
          />
        )}
        <Button onClick={handleAssign} loading={isPending} disabled={!ownerId}>
          <AdminText>{"Assign"}</AdminText>
        </Button>
      </div>
    </Drawer>
  );
}
