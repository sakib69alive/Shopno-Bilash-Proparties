"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

interface ExceptionRow {
  key: number;
  floor: string;
  units: string;
  sqft: string;
}

const toInt = (raw: string) => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Floors "5" or "9-10" → the set of floor numbers they cover. */
function parseFloors(raw: string): number[] | null {
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(raw.trim());
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  if (from < 1 || to < from || to - from > 100) return null;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * New Project only: type how many floors, the usual number of flats on a
 * floor and how many parking spaces — and every flat and parking space is
 * created for you, instead of being added one by one later. Floors that
 * don't follow the usual pattern (a big flat taking a whole floor, a
 * penthouse) are listed as "different floors". The strip underneath shows
 * the result live, floor by floor, before anything is saved.
 */
export function StructureBuilder() {
  const [enabled, setEnabled] = useState(true);
  const [buildings, setBuildings] = useState("1");
  const [floors, setFloors] = useState("");
  const [perFloor, setPerFloor] = useState("");
  const [avgSqft, setAvgSqft] = useState("");
  const [parking, setParking] = useState("");
  const [bikes, setBikes] = useState("");
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [nextKey, setNextKey] = useState(1);

  const floorCount = toInt(floors);
  const usual = toInt(perFloor);
  const buildingCount = Math.max(1, toInt(buildings));

  const plan = useMemo(() => {
    const result: { floor: number; units: number; sqft: number; different: boolean }[] = [];
    for (let f = 1; f <= Math.min(floorCount, 100); f++) result.push({ floor: f, units: usual, sqft: toInt(avgSqft), different: false });
    const invalid: string[] = [];
    for (const row of rows) {
      if (!row.floor.trim() && !row.units.trim()) continue;
      const covered = parseFloors(row.floor);
      if (!covered) {
        invalid.push(row.floor || "?");
        continue;
      }
      for (const f of covered) {
        const entry = result.find((r) => r.floor === f);
        if (entry) {
          entry.units = toInt(row.units);
          if (toInt(row.sqft) > 0) entry.sqft = toInt(row.sqft);
          entry.different = true;
        } else if (floorCount > 0) invalid.push(String(f));
      }
    }
    const perBuilding = result.reduce((sum, r) => sum + r.units, 0);
    const sqftPerBuilding = result.reduce((sum, r) => sum + r.units * r.sqft, 0);
    return { result, invalid, perBuilding, sqftPerBuilding };
  }, [floorCount, usual, avgSqft, rows]);

  const totalUnits = plan.perBuilding * buildingCount;
  const maxUnitsOnFloor = Math.max(1, ...plan.result.map((r) => r.units));

  function updateRow(key: number, patch: Partial<ExceptionRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="border-border bg-surface-raised flex flex-col gap-4 rounded-xl border p-4">
      <Switch
        name="generateStructure"
        label="Create the floors, flats and parking automatically"
        description="Type a few numbers and every flat and parking space is made for you. You can still rename, resize or remove any of them later."
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
      />

      {enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Buildings" name="buildingCount" type="number" min={1} value={buildings} onChange={(e) => setBuildings(e.target.value)} />
            <Input label="Floors (in each building)" name="floorCount" type="number" min={0} value={floors} onChange={(e) => setFloors(e.target.value)} placeholder="e.g. 8" />
            <Input
              label="Usual flats on a floor"
              name="unitsPerFloor"
              type="number"
              min={0}
              value={perFloor}
              onChange={(e) => setPerFloor(e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Usual flat size (sqft, optional)"
              name="avgSqft"
              type="number"
              min={0}
              value={avgSqft}
              onChange={(e) => setAvgSqft(e.target.value)}
              placeholder="e.g. 1200"
              helperText="Every flat starts with this size, so owners' total sqft adds up straight away."
            />
            <Input label="Car parking spaces" name="parkingCount" type="number" min={0} value={parking} onChange={(e) => setParking(e.target.value)} placeholder="e.g. 20" helperText="Made as P-01, P-02, …" />
            <Input label="Motorcycle parking (optional)" name="bikeParkingCount" type="number" min={0} value={bikes} onChange={(e) => setBikes(e.target.value)} placeholder="leave empty if none" helperText="Made as M-01, M-02, … — fine to skip." />
          </div>

          <div className="flex flex-col gap-2.5">
            <div>
              <p className="text-body-sm text-fg font-medium">Floors that are different (optional)</p>
              <p className="text-caption text-fg-subtle">For example one huge flat taking the whole top floor. Use a floor number like 8, or a range like 7-8.</p>
            </div>
            {rows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2.5">
                <Input label="Floor" name="exFloor" value={row.floor} onChange={(e) => updateRow(row.key, { floor: e.target.value })} placeholder="8 or 7-8" />
                <Input label="Flats there" name="exUnits" type="number" min={0} value={row.units} onChange={(e) => updateRow(row.key, { units: e.target.value })} />
                <Input label="Flat size (sqft)" name="exSqft" type="number" min={0} value={row.sqft} onChange={(e) => updateRow(row.key, { sqft: e.target.value })} placeholder="optional" />
                <IconButton icon={X} label="Remove this row" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))} className="mb-1" />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                setRows((prev) => [...prev, { key: nextKey, floor: "", units: "", sqft: "" }]);
                setNextKey((k) => k + 1);
              }}
            >
              <Plus aria-hidden className="size-3.5" />
              Add a different floor
            </Button>
          </div>

          {plan.invalid.length > 0 && (
            <p role="alert" className="text-body-sm text-error">
              Check the &ldquo;different floors&rdquo; rows: {plan.invalid.join(", ")} {plan.invalid.length === 1 ? "isn't" : "aren't"} a floor this project has.
            </p>
          )}

          <div className="bg-surface flex flex-col gap-3 rounded-lg p-3">
            <p className="text-body-sm text-fg">
              {floorCount === 0 && toInt(parking) === 0 && toInt(bikes) === 0 ? (
                "Fill the numbers above to see the result here."
              ) : (
                <>
                  <span className="font-semibold">
                    {buildingCount > 1 ? `${buildingCount} buildings × ` : ""}
                    {floorCount} floor{floorCount === 1 ? "" : "s"} = {totalUnits} flat{totalUnits === 1 ? "" : "s"}
                  </span>
                  {toInt(parking) > 0 && <span> · {toInt(parking)} car parking</span>}
                  {toInt(bikes) > 0 && <span> · {toInt(bikes)} motorcycle</span>}
                  {plan.sqftPerBuilding > 0 && <span className="text-fg-muted"> · {(plan.sqftPerBuilding * buildingCount).toLocaleString("en-US")} sqft in total</span>}
                </>
              )}
            </p>

            {plan.result.length > 0 && usual > 0 && (
              <div className="flex flex-col-reverse gap-1" aria-label="Floors, top floor at the top">
                {plan.result.map((r) => (
                  <div key={r.floor} className="flex items-center gap-2">
                    <span className="text-caption text-fg-subtle w-14 shrink-0 text-right">Floor {r.floor}</span>
                    <div className="flex min-w-0 flex-1 gap-1">
                      {Array.from({ length: r.units }, (_, i) => (
                        <span
                          key={i}
                          style={{ width: `${Math.max(6, 100 / maxUnitsOnFloor)}%`, maxWidth: "3rem" }}
                          className={cn("h-4 rounded-[3px] transition-all duration-300", r.different ? "bg-warning" : "bg-accent")}
                        />
                      ))}
                      {r.units === 0 && <span className="text-caption text-fg-subtle">no flats</span>}
                    </div>
                    <span className="text-caption text-fg-muted w-8 shrink-0">{r.units}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
