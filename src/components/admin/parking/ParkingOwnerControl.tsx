"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { releaseParkingFromOwner } from "@/features/parking/actions";
import { AssignParkingDrawer, type OwnerOption } from "./AssignParkingDrawer";
import type { Customer } from "@/types/customer";

export interface ParkingOwnerControlProps {
  parkingId: string;
  ownerLabel?: string;
  ownerHref?: string;
  customers: Customer[];
  shareholderOptions: OwnerOption[];
  landownerOptions: OwnerOption[];
}

export function ParkingOwnerControl({ parkingId, ownerLabel, ownerHref, customers, shareholderOptions, landownerOptions }: ParkingOwnerControlProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRelease() {
    if (!window.confirm("Release this parking space's owner? It will become available again.")) return;
    startTransition(async () => {
      await releaseParkingFromOwner(parkingId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {ownerLabel ? (
        <div className="flex items-center justify-between">
          {ownerHref ? (
            <Link href={ownerHref} className="text-body text-fg hover:text-accent font-medium transition-colors">
              {ownerLabel}
            </Link>
          ) : (
            <p className="text-body text-fg font-medium">{ownerLabel}</p>
          )}
          <Button variant="outline" size="sm" onClick={handleRelease} loading={isPending} className="hover:text-error">
            <AdminText>{"Release"}</AdminText>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-body-sm text-fg-subtle"><AdminText>{"No owner assigned — independent of any unit’s owner."}</AdminText></p>
          <Button size="sm" onClick={() => setDrawerOpen(true)} className="self-start">
            <AdminText>{"Assign Owner"}</AdminText>
          </Button>
        </>
      )}
      <AssignParkingDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        parkingId={parkingId}
        customers={customers}
        shareholderOptions={shareholderOptions}
        landownerOptions={landownerOptions}
      />
    </div>
  );
}
