"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Layers, LayoutList, Plus, Rows3, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { formatBDT } from "@/lib/format";
import { computeTierUnitAmounts } from "@/features/costAllocations/allocationMethods";
import {
  createUnitTier,
  renameUnitTier,
  setUnitTierAdjustment,
  moveUnitToTier,
  moveUnitsToTier,
  deleteUnitTier,
} from "@/features/costAllocations/tierActions";
import { generateContributions, type AllocationPreview } from "@/features/costAllocations/actions";
import { AllocationPreviewTable } from "@/components/admin/finance/AllocationPreviewTable";
import type { TierAdjustmentMode } from "@/types/finance/costAllocation";

export interface TierBuilderUnit {
  id: string;
  unitNumber: string;
  ownerLabel: string;
  ownerHref?: string;
  sizeSqft: number;
}

export interface TierBuilderTier {
  id: string;
  name: string;
  unitIds: string[];
  adjustmentMode: TierAdjustmentMode;
  adjustmentValue: number;
}

export interface TierBuilderParkingRow {
  id: string;
  parkingNumber: string;
  ownerLabel: string;
}

export interface TierAllocationBuilderProps {
  costAllocationId: string;
  totalAmount: number;
  units: TierBuilderUnit[];
  tiers: TierBuilderTier[];
  preview: AllocationPreview | { error: string } | null;
  parkingSpaces: TierBuilderParkingRow[];
}

/** A distinct hue per tier, cycling — the app's status-tone palette repurposed as tier identity, not status. */
const TIER_ACCENTS = [
  { bar: "bg-accent", chip: "bg-accent-soft text-accent" },
  { bar: "bg-info", chip: "bg-info-soft text-info" },
  { bar: "bg-warning", chip: "bg-warning-soft text-warning" },
  { bar: "bg-success", chip: "bg-success-soft text-success" },
  { bar: "bg-premium", chip: "bg-premium-soft text-premium" },
];

function initials(label: string): string {
  return label.trim().slice(0, 1).toUpperCase() || "?";
}

function OwnerCell({ label, href }: { label: string; href?: string }) {
  const content = (
    <span className="inline-flex items-center gap-2">
      <span className="bg-surface text-fg-muted border-border flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium">
        {initials(label)}
      </span>
      <span>{label}</span>
    </span>
  );
  return href ? (
    <Link href={href} className="text-fg hover:text-accent transition-colors">
      {content}
    </Link>
  ) : (
    <span className="text-fg">{content}</span>
  );
}

/**
 * Method F's editor — every owned unit starts at one equal baseline share;
 * the Admin groups units into named tiers here and nudges each tier's share
 * up or down (percentage or a flat taka delta), with the redistribution
 * math (`computeTierUnitAmounts`) run live in the browser for instant
 * feedback, and the authoritative owner-level rollup below sourced from the
 * server (`previewContributions`) so the numbers shown can never drift from
 * what "Confirm & Generate" will actually write.
 */
export function TierAllocationBuilder({ costAllocationId, totalAmount, units, tiers, preview, parkingSpaces }: TierAllocationBuilderProps) {
  const [newTierName, setNewTierName] = useState("");
  const [parkingAmounts, setParkingAmounts] = useState<Record<string, string>>({});
  const [groupBySize, setGroupBySize] = useState(units.length > 8);
  const [error, setError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const tierOfUnit = useMemo(() => {
    const map = new Map<string, string>();
    for (const tier of tiers) for (const unitId of tier.unitIds) map.set(unitId, tier.id);
    return map;
  }, [tiers]);

  /** Units sharing an identical size are the natural candidate for one tier ("every 1,100 sqft unit"), so grouping by size turns 22 individual picks into a handful of one-click assignments. Purely an organizing view — the underlying per-unit tier membership and math are unchanged either way. */
  const sizeGroups = useMemo(() => {
    const groups = new Map<number, TierBuilderUnit[]>();
    for (const unit of units) {
      const list = groups.get(unit.sizeSqft) ?? [];
      list.push(unit);
      groups.set(unit.sizeSqft, list);
    }
    return [...groups.entries()]
      .map(([sizeSqft, members]) => ({ sizeSqft, members }))
      .sort((a, b) => b.sizeSqft - a.sizeSqft);
  }, [units]);

  const liveMath = useMemo(
    () => computeTierUnitAmounts(units.map((u) => u.id), tiers, totalAmount),
    [units, tiers, totalAmount],
  );
  const baseline = totalAmount / Math.max(1, units.length);

  function run(action: () => Promise<{ error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  function handleGenerate() {
    setError(undefined);
    startTransition(async () => {
      const customParkingAmounts = Object.fromEntries(Object.entries(parkingAmounts).map(([k, v]) => [k, Number(v) || 0]));
      const result = await generateContributions(costAllocationId, {}, customParkingAmounts);
      if (result.error) setError(result.error);
      else {
        router.replace(`?notified=${result.notified ?? 0}&withoutApp=${result.withoutApp ?? 0}`);
        router.refresh();
      }
    });
  }

  const liveError = "error" in liveMath ? liveMath.error : undefined;
  const previewError = preview && "error" in preview ? preview.error : undefined;

  return (
    <div className="flex flex-col gap-5">
      {(error || liveError || previewError) && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{error || liveError || previewError}</p>
        </div>
      )}

      <div className="border-premium/30 bg-premium-soft/40 flex items-center gap-3 rounded-lg border px-4 py-3">
        <span className="bg-premium-soft text-premium flex size-8 shrink-0 items-center justify-center rounded-full">
          <Layers aria-hidden className="size-4" />
        </span>
        <div>
          <p className="text-body-sm text-fg font-medium">Baseline (equal split)</p>
          <p className="text-caption text-fg-subtle">
            {formatBDT(baseline)} per unit, across {units.length} owned unit{units.length === 1 ? "" : "s"} — before tier adjustments
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {tiers.map((tier, i) => {
          const accent = TIER_ACCENTS[i % TIER_ACCENTS.length];
          const perUnit = tier.adjustmentMode === "percentage" ? baseline * (1 + tier.adjustmentValue / 100) : baseline + tier.adjustmentValue;
          return (
            <div key={tier.id} className="border-border bg-surface-raised flex overflow-hidden rounded-lg border">
              <div className={`w-1.5 shrink-0 ${accent.bar}`} />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <input
                    defaultValue={tier.name}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== tier.name && run(() => renameUnitTier(tier.id, e.target.value))}
                    className="text-body-sm text-fg w-full max-w-xs rounded-md border border-transparent bg-transparent px-1 py-0.5 font-medium outline-none focus:border-border-strong focus:bg-surface"
                  />
                  <span className={`text-caption shrink-0 rounded-full px-2 py-0.5 ${accent.chip}`}>
                    {tier.unitIds.length} unit{tier.unitIds.length === 1 ? "" : "s"}
                  </span>
                  <IconButton icon={Trash2} label={`Delete ${tier.name}`} onClick={() => run(() => deleteUnitTier(tier.id))} className="hover:text-error" />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-fg-muted">Adjustment</label>
                    <select
                      defaultValue={tier.adjustmentMode}
                      onChange={(e) => run(() => setUnitTierAdjustment(tier.id, e.target.value as TierAdjustmentMode, tier.adjustmentValue))}
                      className="text-body-sm h-9 rounded-md border border-border-strong bg-surface px-2.5 text-fg outline-none focus:border-accent"
                    >
                      <option value="percentage">% vs. baseline</option>
                      <option value="fixed">Flat taka vs. baseline</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    key={`${tier.id}-${tier.adjustmentMode}`}
                    defaultValue={tier.adjustmentValue || ""}
                    placeholder="0"
                    onBlur={(e) => run(() => setUnitTierAdjustment(tier.id, tier.adjustmentMode, Number(e.target.value) || 0))}
                    className="text-body-sm h-9 w-28 rounded-md border border-border-strong bg-surface px-2.5 text-right text-fg outline-none focus:border-accent"
                  />
                  <p className="text-body-sm text-fg-muted pb-1.5">→ {formatBDT(perUnit)} per unit</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="New Tier Name"
              placeholder="e.g. Tier A — Corner Units"
              value={newTierName}
              onChange={(e) => setNewTierName(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={isPending}
            disabled={!newTierName.trim()}
            onClick={() => {
              const name = newTierName;
              setNewTierName("");
              run(() => createUnitTier(costAllocationId, name));
            }}
          >
            <Plus aria-hidden className="size-3.5" />
            Add Tier
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-label text-fg-subtle uppercase">Assign Units to Tiers</h3>
        <div className="border-border-strong flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setGroupBySize(false)}
            className={`text-caption flex items-center gap-1.5 px-2.5 py-1.5 transition-colors ${!groupBySize ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-surface"}`}
          >
            <Rows3 aria-hidden className="size-3.5" />
            Per Unit
          </button>
          <button
            type="button"
            onClick={() => setGroupBySize(true)}
            className={`text-caption flex items-center gap-1.5 border-l px-2.5 py-1.5 transition-colors ${groupBySize ? "border-border-strong bg-accent-soft text-accent" : "border-border-strong text-fg-muted hover:bg-surface"}`}
          >
            <LayoutList aria-hidden className="size-3.5" />
            Group by Size
          </button>
        </div>
      </div>

      <div className="border-border overflow-x-auto scrollbar-none rounded-lg border">
        <table className="w-full text-left">
          {groupBySize ? (
            <>
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-2.5 font-normal">Size</th>
                  <th className="px-4 py-2.5 font-normal">Units</th>
                  <th className="px-4 py-2.5 font-normal">Tier (bulk-assign)</th>
                  <th className="px-4 py-2.5 text-right font-normal">Group Share</th>
                </tr>
              </thead>
              <tbody>
                {sizeGroups.map((group) => {
                  const memberIds = group.members.map((m) => m.id);
                  const memberTierIds = new Set(memberIds.map((id) => tierOfUnit.get(id) ?? ""));
                  const uniformTierId = memberTierIds.size === 1 ? [...memberTierIds][0] : undefined;
                  const groupShare = memberIds.reduce((s, id) => s + ("error" in liveMath ? 0 : (liveMath.perUnitAmount.get(id) ?? 0)), 0);
                  return (
                    <tr key={group.sizeSqft} className="border-border text-body-sm border-b align-top last:border-b-0">
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">{group.sizeSqft.toLocaleString()} sqft</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {group.members.map((m) => (
                            <span key={m.id} className="bg-surface text-fg-muted text-caption inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                              {m.unitNumber} · {m.ownerLabel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={uniformTierId ?? "__mixed__"}
                          onChange={(e) => run(() => moveUnitsToTier(costAllocationId, memberIds, e.target.value || null))}
                          className="text-body-sm h-8 rounded-md border border-border-strong bg-surface-raised px-2 text-fg outline-none focus:border-accent"
                        >
                          {uniformTierId === undefined && (
                            <option value="__mixed__" disabled>
                              — Mixed —
                            </option>
                          )}
                          <option value="">Baseline</option>
                          {tiers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{"error" in liveMath ? "—" : formatBDT(groupShare)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-2.5 font-normal">Unit</th>
                  <th className="px-4 py-2.5 font-normal">Owner</th>
                  <th className="px-4 py-2.5 text-right font-normal">Area</th>
                  <th className="px-4 py-2.5 font-normal">Tier</th>
                  <th className="px-4 py-2.5 text-right font-normal">Share</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-border text-body-sm border-b last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">{unit.unitNumber}</td>
                    <td className="px-4 py-2.5">
                      <OwnerCell label={unit.ownerLabel} href={unit.ownerHref} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{unit.sizeSqft.toLocaleString()} sqft</td>
                    <td className="px-4 py-2.5">
                      <select
                        defaultValue={tierOfUnit.get(unit.id) ?? ""}
                        onChange={(e) => run(() => moveUnitToTier(costAllocationId, unit.id, e.target.value || null))}
                        className="text-body-sm h-8 rounded-md border border-border-strong bg-surface-raised px-2 text-fg outline-none focus:border-accent"
                      >
                        <option value="">Baseline</option>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {"error" in liveMath ? "—" : formatBDT(liveMath.perUnitAmount.get(unit.id) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>

      {parkingSpaces.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-label text-fg-subtle uppercase">Parking (independent — doesn&apos;t affect unit tiers)</h3>
          <div className="border-border overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <tbody>
                {parkingSpaces.map((p) => (
                  <tr key={p.id} className="border-border text-body-sm border-b last:border-b-0">
                    <td className="px-4 py-2.5">Parking {p.parkingNumber}</td>
                    <td className="px-4 py-2.5 text-fg-muted">{p.ownerLabel}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        value={parkingAmounts[p.id] ?? ""}
                        onChange={(e) => setParkingAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        placeholder="0"
                        className="text-body-sm h-9 w-28 rounded-md border border-border-strong bg-surface-raised px-2 text-right text-fg outline-none focus:border-accent"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {preview && !("error" in preview) && (
        <div className="flex flex-col gap-3">
          <h3 className="text-label text-fg-subtle uppercase">Owner Rollup Preview</h3>
          <AllocationPreviewTable preview={preview} totalAmount={totalAmount} />
        </div>
      )}

      <div>
        <Button onClick={handleGenerate} loading={isPending} disabled={!!liveError || !!previewError || units.length === 0}>
          Confirm &amp; Generate
        </Button>
      </div>
    </div>
  );
}
