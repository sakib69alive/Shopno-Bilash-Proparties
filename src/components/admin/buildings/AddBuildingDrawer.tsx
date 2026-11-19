"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { BuildingForm } from "./BuildingForm";
import { createBuilding } from "@/features/buildings/actions";

export interface AddBuildingDrawerProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function AddBuildingDrawer({ open, onClose, projectId }: AddBuildingDrawerProps) {
  const { t: adminCopy } = useUiLanguage();
  const router = useRouter();

  return (
    <Drawer open={open} onClose={onClose} side="right" title={adminCopy("Add Building")}>
      <BuildingForm
        action={createBuilding}
        projectId={projectId}
        submitLabel="Add Building"
        onSuccess={() => {
          onClose();
          router.refresh();
        }}
      />
    </Drawer>
  );
}
