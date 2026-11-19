"use client";

import { useUiLanguage } from "@/components/ui/UiLanguage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMaterialThreshold } from "@/features/procurement/materialThresholdActions";

export interface MaterialThresholdControlProps {
  projectId: string;
  materialId: string;
  unit: string;
  currentThreshold: number | undefined;
}

/** Inline low-stock threshold editor — one row per material on the Stock page, since thresholds are project-scoped (see `MaterialThreshold`'s own doc comment). */
export function MaterialThresholdControl({ projectId, materialId, unit, currentThreshold }: MaterialThresholdControlProps) {
  const { t: adminCopy } = useUiLanguage();
  const [value, setValue] = useState(currentThreshold?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleBlur() {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed) || parsed === currentThreshold) return;
    startTransition(async () => {
      const result = await setMaterialThreshold(projectId, materialId, parsed);
      if (result.error) window.alert(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        placeholder={adminCopy("Not set")}
        className="text-body-sm h-8 w-24 rounded-md border border-border-strong bg-surface-raised px-2 text-fg outline-none focus:border-accent"
      />
      <span className="text-caption text-fg-subtle">{unit}</span>
    </div>
  );
}
