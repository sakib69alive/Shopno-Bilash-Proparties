"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatBDT } from "@/lib/format";
import { generateContributions, updateUnitSizes } from "@/features/costAllocations/actions";
import { computeSplitOnTop, computeSplitPlan, type SplitBasis, type SplitOverride } from "@/features/costAllocations/splitPlan";

export interface PlannerUnit {
  id: string;
  unitNumber: string;
  ownerLabel: string;
  sizeSqft: number;
  floorLabel: string;
  floorNumber: number;
}

export interface PlannerParking {
  id: string;
  parkingNumber: string;
  ownerLabel: string;
}

export interface SplitPlannerProps {
  costAllocationId: string;
  totalAmount: number;
  units: PlannerUnit[];
  parkingSpaces: PlannerParking[];
  defaultBasis: SplitBasis;
}

const OWNER_TONES = ["bg-success", "bg-warning", "bg-info", "bg-error", "bg-accent"];

const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/** "1A" → "A": the flat's position on its floor, so "all the A flats" can be picked in one tap. */
function positionOf(unitNumber: string): string | null {
  const m = /([A-Za-z]+)$/.exec(unitNumber.trim());
  return m ? m[1].toUpperCase() : null;
}

/**
 * Split Planner — for the "pick the flats" cost methods. The Admin chooses
 * which flats pay (by floor, by position such as every "A" flat, or one by
 * one), picks whether the rest is shared equally or by area, and can fix any
 * flat's share by taka or by percent. The chart on the right moves with every
 * tap, showing how much each flat — and each owner — will be billed, before
 * anything is saved. The figures come from `computeSplitPlan`, so they always
 * add up to the total exactly.
 */
export function SplitPlanner({ costAllocationId, totalAmount, units, parkingSpaces, defaultBasis }: SplitPlannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(units.map((u) => u.id)));
  const [basis, setBasis] = useState<SplitBasis>(defaultBasis);
  const [overrides, setOverrides] = useState<Record<string, SplitOverride>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<SplitOverride["mode"]>("extraPercent");
  const [editValue, setEditValue] = useState("");
  // "Keep everyone else's amount": a custom amount is added ON TOP of the budget instead of being taken from the other flats.
  const [onTop, setOnTop] = useState(false);
  const [parkingAmounts, setParkingAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();
  // Sizes typed in here (a flat that is really bigger or smaller than on file). They drive the sums on screen, and are saved to the flat when you press Save.
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const sq = (u: PlannerUnit) => sizes[u.id] ?? u.sizeSqft;
  // A size typed here is saved to the flat straight away (when you leave the box), so every later budget starts from the corrected size.
  const [sizeNote, setSizeNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  async function saveSize(unit: PlannerUnit, value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      setSizeNote({ id: unit.id, text: "Enter a size above 0.", ok: false });
      return;
    }
    const result = await updateUnitSizes(costAllocationId, { [unit.id]: value });
    setSizeNote(result.error ? { id: unit.id, text: result.error, ok: false } : { id: unit.id, text: "Saved on the flat — future budgets use this size.", ok: true });
  }

  const sorted = useMemo(
    () => [...units].sort((a, b) => a.floorNumber - b.floorNumber || natural.compare(a.unitNumber, b.unitNumber)),
    [units],
  );
  const floors = useMemo(() => {
    const map = new Map<number, { label: string; units: PlannerUnit[] }>();
    for (const u of sorted) {
      const entry = map.get(u.floorNumber) ?? { label: u.floorLabel, units: [] };
      entry.units.push(u);
      map.set(u.floorNumber, entry);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  }, [sorted]);
  const positions = useMemo(() => [...new Set(sorted.map((u) => positionOf(u.unitNumber)).filter((p): p is string => !!p))].sort(), [sorted]);

  const chosen = sorted.filter((u) => selected.has(u.id));
  const plan = useMemo(
    () => computeSplitPlan(totalAmount, chosen.map((u) => ({ id: u.id, sqft: sq(u) })), basis, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalAmount, chosen, basis, overrides, sizes],
  );

  const onTopPlan = useMemo(
    () => computeSplitOnTop(totalAmount, chosen.map((u) => ({ id: u.id, sqft: sq(u) })), basis, overrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalAmount, chosen, basis, overrides, sizes],
  );
  const hasCustom = Object.keys(overrides).some((id) => selected.has(id));
  const topMode = onTop && hasCustom;
  /** The figures shown and saved: the shared-out plan, or (with the tick) the "on top" one. */
  const shown: Record<string, number> = topMode ? onTopPlan.amounts : plan.amounts;
  const parkingTotal = Object.values(parkingAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const maxAmount = Math.max(1, ...chosen.map((u) => shown[u.id] ?? 0));
  const focus = focusId ? units.find((u) => u.id === focusId) : undefined;

  const ownerOrder = useMemo(() => [...new Set(sorted.map((u) => u.ownerLabel))], [sorted]);
  const ownerTotals = useMemo(() => {
    const map = new Map<string, { amount: number; count: number; sqft: number }>();
    for (const u of chosen) {
      const row = map.get(u.ownerLabel) ?? { amount: 0, count: 0, sqft: 0 };
      row.amount += shown[u.id] ?? 0;
      row.count += 1;
      row.sqft += sq(u);
      map.set(u.ownerLabel, row);
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, shown, sizes]);
  const maxOwner = Math.max(1, ...ownerTotals.map(([, r]) => r.amount));

  function select(ids: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  /** Tap on a flat: choose / un-choose it. */
  function toggleUnit(unit: PlannerUnit) {
    const on = !selected.has(unit.id);
    select([unit.id], on);
    if (!on && focusId === unit.id) setFocusId(null);
  }

  /** The small pencil on a flat: open its editor (size and amount) right under its floor. */
  function openEditor(unit: PlannerUnit) {
    if (focusId === unit.id) {
      setFocusId(null);
      return;
    }
    setFocusId(unit.id);
    const current = overrides[unit.id];
    setEditMode(current?.mode ?? "extraPercent");
    setEditValue(current ? String(current.value) : "");
    select([unit.id], true);
  }

  function applyOverride() {
    if (!focus) return;
    const value = Number(editValue);
    if (!Number.isFinite(value) || editValue.trim() === "") return;
    if ((editMode === "amount" || editMode === "percent") && value < 0) return;
    setOverrides((prev) => ({ ...prev, [focus.id]: { mode: editMode, value } }));
    select([focus.id], true);
  }

  function clearOverride(id: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (focusId === id) setEditValue("");
  }

  function handleConfirm() {
    setError(undefined);
    startTransition(async () => {
      const customUnitAmounts: Record<string, number> = {};
      for (const u of chosen) customUnitAmounts[u.id] = shown[u.id] ?? 0;
      const customParkingAmounts = Object.fromEntries(Object.entries(parkingAmounts).map(([k, v]) => [k, Number(v) || 0]));
      const changedSizes = Object.fromEntries(Object.entries(sizes).filter(([id, v]) => v !== units.find((u) => u.id === id)?.sizeSqft));
      if (Object.keys(changedSizes).length > 0) {
        const saved = await updateUnitSizes(costAllocationId, changedSizes);
        if (saved.error) {
          setError(saved.error);
          return;
        }
      }
      const result = await generateContributions(costAllocationId, customUnitAmounts, customParkingAmounts, topMode ? { baseUnitAmounts: onTopPlan.base } : undefined);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace(`?notified=${result.notified ?? 0}&withoutApp=${result.withoutApp ?? 0}`);
      router.refresh();
    });
  }

  const overrideEntries = Object.entries(overrides).filter(([id]) => selected.has(id));
  const perSqftNote =
    basis === "equal" && chosen.length > 1 ? (() => {
      const rates = chosen.filter((u) => sq(u) > 0).map((u) => (plan.amounts[u.id] ?? 0) / sq(u));
      return rates.length > 1 && Math.max(...rates) > Math.min(...rates) * 1.25;
    })() : false;


  const editor = focus ? (
    <div className="border-accent bg-surface-raised flex flex-col gap-3 rounded-lg border-2 p-3">
      <p className="text-body-sm">
        <span className="font-semibold">{focus.unitNumber}</span> · {focus.ownerLabel}
        {selected.has(focus.id) && shown[focus.id] !== undefined && <span className="text-fg-muted"> — pays {formatBDT(shown[focus.id])} now</span>}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-caption text-fg-subtle flex flex-col gap-1">
          Size (sqft)
          <input
            type="number"
            min={0}
            value={sizes[focus.id] ?? focus.sizeSqft}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSizes((prev) => ({ ...prev, [focus.id]: Number.isFinite(v) && v >= 0 ? v : 0 }));
            }}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v !== focus.sizeSqft || sizes[focus.id] !== undefined) void saveSize(focus, v);
            }}
            aria-label="Flat size in sqft"
            className="text-body-sm h-10 w-32 rounded-md border border-border-strong bg-surface px-3 text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        {sizes[focus.id] !== undefined && sizes[focus.id] !== focus.sizeSqft && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              void saveSize(focus, focus.sizeSqft);
              setSizes((prev) => { const n = { ...prev }; delete n[focus.id]; return n; });
            }}
          >
            Back to {focus.sizeSqft.toLocaleString("en-US")}
          </Button>
        )}
      </div>
      {sizeNote && sizeNote.id === focus.id && <p className={cn("text-caption", sizeNote.ok ? "text-success" : "text-error")}>{sizeNote.text}</p>}
      <div className="flex flex-col gap-2">
        <p className="text-caption text-fg-subtle">How much should this flat pay?</p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={editMode === "extraPercent"} onClick={() => setEditMode("extraPercent")}>More by %</Chip>
          <Chip active={editMode === "extraAmount"} onClick={() => setEditMode("extraAmount")}>More by ৳</Chip>
          <Chip active={editMode === "amount"} onClick={() => setEditMode("amount")}>Exactly ৳</Chip>
          <Chip active={editMode === "percent"} onClick={() => setEditMode("percent")}>Exactly % of total</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={editMode === "amount" || editMode === "percent" ? 0 : undefined}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyOverride())}
            placeholder={editMode === "amount" || editMode === "extraAmount" ? "e.g. 25000" : "e.g. 5"}
            aria-label="Custom value"
            className="text-body-sm h-10 w-36 rounded-md border border-border-strong bg-surface px-3 text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
          <Button type="button" size="sm" onClick={applyOverride} disabled={editValue.trim() === ""}>
            <Check aria-hidden className="size-3.5" />
            Set
          </Button>
          {overrides[focus.id] && (
            <Button type="button" size="sm" variant="outline" onClick={() => clearOverride(focus.id)}>
              Back to automatic
            </Button>
          )}
        </div>
        <p className="text-caption text-fg-subtle">Minus means less. The other flats cover the difference automatically.</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {error && (
          <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p className="text-body-sm">{error}</p>
          </div>
        )}

        <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">1 · Which flats pay? (tap to choose)</h3>
          <div className="flex flex-wrap gap-2">
            <Chip onClick={() => select(units.map((u) => u.id), true)}>All flats</Chip>
            <Chip onClick={() => select(units.map((u) => u.id), false)}>None</Chip>
            {positions.length > 1 && positions.map((p) => (
              <Chip key={p} onClick={() => select(sorted.filter((u) => positionOf(u.unitNumber) === p).map((u) => u.id), !sorted.filter((u) => positionOf(u.unitNumber) === p).every((u) => selected.has(u.id)))}>
                Every {p} flat
              </Chip>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {floors.map((floor) => {
              const ids = floor.units.map((u) => u.id);
              const allOn = ids.every((id) => selected.has(id));
              return (
                <div key={floor.label} className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => select(ids, !allOn)} className="text-label text-fg-subtle hover:text-accent w-fit text-left uppercase transition-colors">
                    {floor.label} {allOn ? "· all selected" : ""} <span className="normal-case">(tap to {allOn ? "clear" : "select all"})</span>
                  </button>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
                    {floor.units.map((u) => {
                      const on = selected.has(u.id);
                      const custom = overrides[u.id];
                      const amount = shown[u.id];
                      return (
                        <div key={u.id} className="relative">
                        <button
                          type="button"
                          onClick={() => toggleUnit(u)}
                          aria-pressed={on}
                          title={`${u.unitNumber} · ${u.ownerLabel}`}
                          className={cn(
                            "flex min-h-[7rem] w-full flex-col items-start justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition-[transform,box-shadow,background-color,border-color] duration-200 active:scale-90",
                            on ? "border-accent bg-accent text-accent-foreground shadow-sm" : "border-border-strong bg-surface-raised text-fg-muted hover:border-accent",
                            focusId === u.id && "ring-accent ring-2 ring-offset-1",
                          )}
                        >
                          <span className="w-full pr-8">
                            <span className="text-h4 block leading-none font-semibold">{u.unitNumber}</span>
                            <span className={cn("text-caption mt-1 block truncate", on ? "text-accent-foreground/80" : "text-fg-subtle")}>{u.ownerLabel}</span>
                          </span>
                          <span className="flex w-full items-end justify-between gap-2">
                            <span className={cn("text-caption leading-tight", on ? "text-accent-foreground/80" : "text-fg-subtle")}>
                              {sq(u).toLocaleString("en-US")} sqft{sizes[u.id] !== undefined && sizes[u.id] !== u.sizeSqft ? "*" : ""}
                            </span>
                            <span className="text-body font-semibold tabular-nums">{on && amount !== undefined ? formatBDT(amount) : "—"}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditor(u)}
                          aria-label={`Edit ${u.unitNumber}: size and amount`}
                          title="Edit size and amount"
                          className={cn(
                            "absolute top-2 right-2 flex size-8 items-center justify-center rounded-full transition-colors",
                            focusId === u.id ? "bg-warning text-white" : custom || sizes[u.id] !== undefined ? "bg-warning/20 text-warning" : on ? "bg-white/15 text-accent-foreground hover:bg-white/30" : "text-fg-subtle hover:bg-surface",
                          )}
                        >
                          <Pencil aria-hidden className="size-3.5" />
                        </button>
                        </div>
                      );
                    })}
                  </div>
                  {focus && focus.floorNumber === floor.units[0].floorNumber && editor}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">2 · Should everyone pay the same?</h3>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sharing basis">
            <Chip active={basis === "equal"} onClick={() => setBasis("equal")}>Yes — same for every flat</Chip>
            <Chip active={basis === "sqft"} onClick={() => setBasis("sqft")}>No — bigger flat pays more</Chip>
          </div>
          {perSqftNote && (
            <p className="text-body-sm text-warning">Heads up: with the same amount per flat, a small flat pays much more per sqft than a big one. Switch to &ldquo;By area&rdquo; or set a custom amount on the small/big flats.</p>
          )}
        </div>

        <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">3 · Change one flat&apos;s amount (optional)</h3>
          {focus ? (
            <p className="text-body-sm text-fg-muted">
              Editing <span className="font-semibold">{focus.unitNumber}</span> — the box is right under its floor above (tap the pencil again to close it).
            </p>
          ) : (
            <p className="text-body-sm text-fg-muted">Tap the small pencil on a flat to change its size or how much it pays — more or less by a %, by taka, or an exact amount. The other flats cover the difference automatically.</p>
          )}

          <label className="text-body-sm border-border-strong bg-surface-raised flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3">
            <input type="checkbox" checked={onTop} onChange={(e) => setOnTop(e.target.checked)} className="accent-accent mt-0.5 size-5 shrink-0" />
            <span>
              <span className="font-semibold">Keep everyone else&apos;s amount — add the extra on top</span>
              <span className="text-fg-subtle block">
                Tick this and a flat given more (or less) changes only the total: the other flats pay what they would have paid anyway. Without the tick, the others cover the difference and the total stays {formatBDT(totalAmount)}.
              </span>
            </span>
          </label>

          {overrideEntries.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {overrideEntries.map(([id, o]) => {
                const u = units.find((x) => x.id === id);
                return (
                  <li key={id} className="bg-warning-soft text-warning text-caption flex items-center gap-1.5 rounded-full py-1 pr-1.5 pl-3 font-medium">
                    {u?.unitNumber}: {o.mode === "percent" ? `${o.value}% of total` : o.mode === "extraPercent" ? `${o.value > 0 ? "+" : ""}${o.value}%` : o.mode === "extraAmount" ? `${o.value > 0 ? "+" : "−"}${formatBDT(Math.abs(o.value))}` : formatBDT(o.value)}
                    <button type="button" aria-label={`Remove custom amount for ${u?.unitNumber}`} onClick={() => clearOverride(id)} className="hover:bg-warning/15 rounded-full p-0.5">
                      <X aria-hidden className="size-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {parkingSpaces.length > 0 && (
          <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
            <h3 className="text-label text-fg-subtle uppercase">Parking (optional, billed on top)</h3>
            <label className="text-body-sm flex flex-wrap items-center gap-2">
              Same amount for every parking space:
              <input
                type="number"
                min={0}
                placeholder="৳"
                aria-label="Same amount for every parking space"
                onChange={(e) => {
                  const v = e.target.value;
                  setParkingAmounts(Object.fromEntries(parkingSpaces.map((p) => [p.id, v])));
                }}
                className="text-body-sm h-9 w-28 rounded-md border border-border-strong bg-surface-raised px-2 text-right text-fg outline-none focus:border-accent"
              />
              <span className="text-caption text-fg-subtle">or type each one below</span>
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {parkingSpaces.map((p) => (
                <label key={p.id} className="text-body-sm flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {p.parkingNumber} <span className="text-fg-subtle">· {p.ownerLabel}</span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={parkingAmounts[p.id] ?? ""}
                    onChange={(e) => setParkingAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="0"
                    className="text-body-sm h-9 w-28 shrink-0 rounded-md border border-border-strong bg-surface-raised px-2 text-right text-fg outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live result — beside the picker on wide screens, above the details on narrow ones is not needed: it follows the picker. */}
      <aside className="flex flex-col gap-4">
        <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">What happens now</h3>
          <p className="text-body">
            {topMode
              ? `Budget ${formatBDT(totalAmount)} · extra ${onTopPlan.extra >= 0 ? "+" : "−"}${formatBDT(Math.abs(onTopPlan.extra))} · new total ${formatBDT(onTopPlan.newTotal)}.`
              : chosen.length === 0
              ? "Tap flats to choose who pays."
              : plan.error
                ? "Fix the problem shown below."
                : `${formatBDT(totalAmount)} is divided between ${chosen.length} flat${chosen.length === 1 ? "" : "s"}.${plan.sharedCount > 0 ? ` On average each flat pays about ${formatBDT(Math.round(Math.max(0, plan.sharedTotal) / plan.sharedCount))}.` : ""}`}
          </p>
          <div className="grid grid-cols-2 gap-2 text-center">
            <Stat label={topMode ? "New total to collect" : "Total to collect"} value={formatBDT(topMode ? onTopPlan.newTotal : totalAmount)} />
            <Stat label="Flats paying" value={String(chosen.length)} />
          </div>
          {topMode ? (
            <div className="bg-warning-soft text-body-sm flex flex-col gap-1 rounded-md px-3 py-2">
              <p className="flex justify-between"><span>Budget as planned</span><span className="font-semibold tabular-nums">{formatBDT(totalAmount)}</span></p>
              <p className="flex justify-between"><span>{onTopPlan.extra >= 0 ? "Extra added on top" : "Taken off"}</span><span className="font-semibold tabular-nums">{formatBDT(Math.abs(onTopPlan.extra))}</span></p>
              <p className="flex justify-between border-t border-warning/30 pt-1"><span>New total</span><span className="font-semibold tabular-nums">{formatBDT(onTopPlan.newTotal)}</span></p>
            </div>
          ) : plan.error ? (
            <p role="alert" className="bg-error-soft text-error text-body-sm rounded-md px-3 py-2">{plan.error}</p>
          ) : chosen.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Pick at least one flat.</p>
          ) : (
            <p className="bg-success-soft text-success text-body-sm rounded-md px-3 py-2">Correct — adds up to the total{parkingTotal > 0 ? ` (plus ${formatBDT(parkingTotal)} parking)` : ""}.</p>
          )}
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">Each flat pays</h3>
          {chosen.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Nothing selected.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {chosen.map((u) => {
                const amount = shown[u.id] ?? 0;
                const custom = !!overrides[u.id];
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => openEditor(u)}
                      title={sq(u) > 0 ? `${formatBDT(Math.round(amount / sq(u)))} per sqft${custom ? " · custom" : ""}` : undefined}
                      className="bg-surface hover:border-accent w-full rounded-lg border border-transparent px-3 py-2 text-left transition-colors"
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-body-sm min-w-0 truncate">
                          <span className="font-semibold">{u.unitNumber}</span> <span className="text-fg-subtle">· {u.ownerLabel}</span>
                        </span>
                        <span className="text-body-sm shrink-0 font-semibold tabular-nums">{formatBDT(amount)}</span>
                      </span>
                      <span className="bg-border mt-1.5 block h-1.5 overflow-hidden rounded-full">
                        <span
                          className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", custom ? "bg-warning" : "bg-accent")}
                          style={{ width: `${Math.max(2, (amount / maxAmount) * 100)}%` }}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-xl border p-4">
          <h3 className="text-label text-fg-subtle uppercase">Each owner pays</h3>
          {ownerTotals.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Nothing selected.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {ownerTotals.map(([owner, row]) => (
                <li key={owner} className="bg-surface rounded-lg px-3 py-2">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-body-sm min-w-0 truncate font-semibold">{owner}</span>
                    <span className="text-body-sm shrink-0 font-semibold tabular-nums">{formatBDT(row.amount)}</span>
                  </span>
                  <span className="bg-border mt-1.5 block h-1.5 overflow-hidden rounded-full">
                    <span
                      className={cn("block h-full rounded-full transition-[width] duration-500 ease-out", OWNER_TONES[ownerOrder.indexOf(owner) % OWNER_TONES.length])}
                      style={{ width: `${Math.max(2, (row.amount / maxOwner) * 100)}%` }}
                    />
                  </span>
                  <span className="text-caption text-fg-subtle">
                    {row.count} flat{row.count === 1 ? "" : "s"} · {row.sqft.toLocaleString("en-US")} sqft
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button type="button" onClick={handleConfirm} loading={isPending} disabled={chosen.length === 0 || (!topMode && !!plan.error)} className="w-full">
          Save &amp; send to clients
        </Button>
        <p className="text-caption text-fg-subtle text-center">Each owner gets the amount and last date in their app.</p>
      </aside>
    </div>
  );
}

function Chip({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-body-sm rounded-full border px-3.5 py-1.5 transition-[transform,background-color,border-color] duration-150 active:scale-95",
        active ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-surface-raised hover:border-accent",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-lg px-2 py-2.5">
      <p className="text-body-sm font-semibold tabular-nums">{value}</p>
      <p className="text-caption text-fg-subtle mt-0.5">{label}</p>
    </div>
  );
}
