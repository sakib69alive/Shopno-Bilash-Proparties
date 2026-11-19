"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BulkParkingGeneratorDrawer } from "@/components/admin/parking/BulkParkingGeneratorDrawer";
import type { Building } from "@/types/project";

export interface ProjectParkingHeaderProps {
  projectId: string;
  buildings: Building[];
  count: number;
  canManage: boolean;
}

export function ProjectParkingHeader({ projectId, buildings, count, canManage }: ProjectParkingHeaderProps) {
  const [generatorOpen, setGeneratorOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <p className="text-body-sm text-fg-muted">{count} parking space(s) in this project.</p>
      <div className="flex items-center gap-2.5">
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
            <Wand2 aria-hidden className="size-3.5" />
            <AdminText>{"Generate Parking"}</AdminText>
          </Button>
        )}
        <Link
          href={`/admin/parking?projectId=${projectId}`}
          className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          Manage all parking <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
      {canManage && <BulkParkingGeneratorDrawer open={generatorOpen} onClose={() => setGeneratorOpen(false)} projectId={projectId} buildings={buildings} />}
    </div>
  );
}
