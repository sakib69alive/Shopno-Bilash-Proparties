"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useState } from "react";
import Link from "next/link";
import { Building2, Layers, Home, Plus, Wand2 } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { STATUS_CONFIG, STATUS_TONE_CLASSES } from "@/lib/status";
import { AddBuildingDrawer } from "@/components/admin/buildings/AddBuildingDrawer";
import { AddFloorDrawer } from "@/components/admin/floors/AddFloorDrawer";
import { BulkStructureGeneratorDrawer } from "@/components/admin/floors/BulkStructureGeneratorDrawer";
import type { Building, Floor } from "@/types/project";
import type { UnitStatus } from "@/types/unit";

export interface GridUnit {
  id: string;
  unitNumber: string;
  status: UnitStatus;
  ownerLabel?: string;
}

export interface GridFloor extends Floor {
  units: GridUnit[];
}

export interface GridBuilding extends Building {
  floors: GridFloor[];
}

export interface ProjectUnitsGridProps {
  projectId: string;
  buildings: GridBuilding[];
}

export function ProjectUnitsGrid({ projectId, buildings }: ProjectUnitsGridProps) {
  const [addBuildingOpen, setAddBuildingOpen] = useState(false);
  const [addFloorFor, setAddFloorFor] = useState<{ buildingId: string; nextFloorNumber: number } | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  if (buildings.length === 0) {
    return (
      <>
        <EmptyState
          icon={Building2}
          title="No building structure has been configured yet"
          description="Add this project's first building to start organizing floors and units."
          action={
            <Button size="md" onClick={() => setAddBuildingOpen(true)}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Building"}</AdminText>
            </Button>
          }
        />
        <AddBuildingDrawer open={addBuildingOpen} onClose={() => setAddBuildingOpen(false)} projectId={projectId} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-end gap-2.5">
        <Button variant="outline" size="sm" onClick={() => setGeneratorOpen(true)}>
          <Wand2 aria-hidden className="size-3.5" />
          <AdminText>{"Generate Structure"}</AdminText>
        </Button>
        <Button size="sm" onClick={() => setAddBuildingOpen(true)}>
          <Plus aria-hidden className="size-3.5" />
          <AdminText>{"Add Building"}</AdminText>
        </Button>
      </div>

      {buildings.map((building) => (
        <section key={building.id} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 aria-hidden className="text-fg-subtle size-4" />
              <h2 className="text-h4">{building.name}</h2>
              {building.code && <span className="text-caption text-fg-subtle">({building.code})</span>}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddFloorFor({ buildingId: building.id, nextFloorNumber: (building.floors.at(-1)?.floorNumber ?? 0) + 1 })}
            >
              <Plus aria-hidden className="size-3.5" />
              <AdminText>{"Add Floor"}</AdminText>
            </Button>
          </div>

          {building.floors.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No floors configured"
              description="Add this building's first floor to start placing units."
              action={
                <Button
                  size="sm"
                  onClick={() => setAddFloorFor({ buildingId: building.id, nextFloorNumber: 1 })}
                >
                  <AdminText>{"Add Floor"}</AdminText>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-5">
              {building.floors.map((floor) => (
                <div key={floor.id}>
                  <h3 className="text-label text-fg-subtle mb-2 uppercase">{floor.label}</h3>
                  {floor.units.length === 0 ? (
                    <EmptyState
                      icon={Home}
                      title="No units configured on this floor"
                      description="Add units to this floor to start tracking them."
                      className="py-8"
                      action={
                        <Link href={`/admin/properties/new?projectId=${projectId}`} className="text-body-sm text-accent font-medium hover:underline">
                          <AdminText>{"Add Units"}</AdminText>
                        </Link>
                      }
                    />
                  ) : (
                    <div className="grid auto-rows-[92px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                      {floor.units.map((unit) => {
                        const config = STATUS_CONFIG[unit.status];
                        return (
                          <Link
                            key={unit.id}
                            href={`/admin/properties/${unit.id}`}
                            className={`flex flex-col justify-between rounded-lg border border-transparent p-3 transition-transform hover:-translate-y-0.5 hover:shadow-sm ${STATUS_TONE_CLASSES[config.tone]}`}
                          >
                            <p className="text-body-sm font-semibold">{unit.unitNumber}</p>
                            <p className="text-caption truncate">{unit.ownerLabel ?? config.label}</p>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <AddBuildingDrawer open={addBuildingOpen} onClose={() => setAddBuildingOpen(false)} projectId={projectId} />
      {addFloorFor && (
        <AddFloorDrawer
          open={!!addFloorFor}
          onClose={() => setAddFloorFor(null)}
          buildingId={addFloorFor.buildingId}
          nextFloorNumber={addFloorFor.nextFloorNumber}
        />
      )}
      <BulkStructureGeneratorDrawer open={generatorOpen} onClose={() => setGeneratorOpen(false)} buildings={buildings} />
    </div>
  );
}
