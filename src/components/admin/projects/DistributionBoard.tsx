"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Car, Check, Home, Lock, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { distributeToOwner, moveToOwner, releaseFromOwners, setFlatSizes, type DistributeTarget } from "@/features/ownership/distributeActions";

export interface BoardUnit {
  id: string;
  number: string;
  sqft: number;
  /** Who holds it now: matches a `BoardPerson.ownerKey`, or a customer key for sold flats. */
  ownerKey?: string;
  ownerLabel?: string;
  /** Sold to a customer — shown, never changed from here. */
  locked?: boolean;
}

export interface BoardParking {
  id: string;
  number: string;
  /** Car (default) or motorcycle space. */
  kind?: "car" | "bike";
  ownerKey?: string;
  ownerLabel?: string;
}

export interface BoardUnitGroup {
  label: string;
  units: BoardUnit[];
}

export interface BoardPerson {
  /** Unique per chip — a landowner with two agreements is two chips. */
  id: string;
  ownerKey: string;
  name: string;
  roleLabel: string;
  target: DistributeTarget;
}

export interface DistributionBoardProps {
  projectId: string;
  groups: BoardUnitGroup[];
  parking: BoardParking[];
  people: BoardPerson[];
  canAssignParking: boolean;
  canEditSizes?: boolean;
}

// Each person gets one of these (always shown together with their name, so colour is never the only signal).
const PERSON_TONES = [
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-info-soft text-info",
  "bg-error-soft text-error",
  "bg-accent-soft text-accent",
];

function formatSqft(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

/** Counts up/down to `value` over ~350ms, so a total visibly moves when the selection changes. */
function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 350);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (value - from) * eased;
      setShown(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{formatSqft(shown)}</>;
}

/**
 * Hand out a project's flats and parking spaces by tapping them: every flat
 * is a button (number + sqft) laid out in order, parking below it. Tap the
 * ones you want, pick the person, press Give — and the panel beside shows,
 * live and before anything is saved, how many flats, how many sqft and how
 * many parking spaces that person ends up with.
 */
export function DistributionBoard({ projectId, groups, parking, people, canAssignParking, canEditSizes }: DistributionBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [selectedParking, setSelectedParking] = useState<Set<string>>(new Set());
  const [personId, setPersonId] = useState<string>(people[0]?.id ?? "");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; lines: string[] } | null>(null);
  const lastClicked = useRef<string | null>(null);

  const allUnits = useMemo(() => groups.flatMap((g) => g.units), [groups]);
  const unitsById = useMemo(() => new Map(allUnits.map((u) => [u.id, u])), [allUnits]);
  const parkingById = useMemo(() => new Map(parking.map((p) => [p.id, p])), [parking]);
  const person = people.find((p) => p.id === personId);

  const toneByOwner = useMemo(() => {
    const map = new Map<string, string>();
    const keys = [...new Set([...people.map((p) => p.ownerKey), ...allUnits.map((u) => u.ownerKey), ...parking.map((p) => p.ownerKey)].filter((k): k is string => !!k))];
    keys.forEach((key, i) => map.set(key, PERSON_TONES[i % PERSON_TONES.length]));
    return map;
  }, [people, allUnits, parking]);

  // Live per-person totals, now and after the pending selection is given to the chosen person.
  const summary = useMemo(() => {
    const rows = new Map<string, { name: string; units: BoardUnit[]; parking: number }>();
    for (const p of people) rows.set(p.ownerKey, { name: p.name, units: [], parking: 0 });
    for (const u of allUnits) {
      if (!u.ownerKey) continue;
      const row = rows.get(u.ownerKey) ?? { name: u.ownerLabel ?? "Customer", units: [], parking: 0 };
      row.units.push(u);
      rows.set(u.ownerKey, row);
    }
    for (const p of parking) {
      if (!p.ownerKey) continue;
      const row = rows.get(p.ownerKey) ?? { name: p.ownerLabel ?? "Customer", units: [], parking: 0 };
      row.parking += 1;
      rows.set(p.ownerKey, row);
    }
    return rows;
  }, [people, allUnits, parking]);

  const freeSelectedUnits = [...selectedUnits].map((id) => unitsById.get(id)).filter((u): u is BoardUnit => !!u && !u.ownerKey);
  const ownedSelectedUnits = [...selectedUnits].map((id) => unitsById.get(id)).filter((u): u is BoardUnit => !!u && !!u.ownerKey && !u.locked);
  const freeSelectedParking = [...selectedParking].map((id) => parkingById.get(id)).filter((p): p is BoardParking => !!p && !p.ownerKey);
  const ownedSelectedParking = [...selectedParking].map((id) => parkingById.get(id)).filter((p): p is BoardParking => !!p && !!p.ownerKey);

  const current = person ? summary.get(person.ownerKey) : undefined;
  // Selected flats that belong to someone else: these can be moved to the chosen person in one tap.
  const movingUnits = ownedSelectedUnits.filter((u) => u.ownerKey !== person?.ownerKey);
  const movingParking = ownedSelectedParking.filter((p) => p.ownerKey !== person?.ownerKey);
  const incomingUnits = [...freeSelectedUnits, ...movingUnits];
  const incomingSqft = incomingUnits.reduce((sum, u) => sum + u.sqft, 0);
  const currentSqft = current?.units.reduce((sum, u) => sum + u.sqft, 0) ?? 0;
  const currentUnitCount = current?.units.length ?? 0;
  const currentParking = current?.parking ?? 0;

  const totalFree = allUnits.filter((u) => !u.ownerKey).length;
  const totalFreeParking = parking.filter((p) => !p.ownerKey).length;

  function toggleUnit(unit: BoardUnit, shift: boolean) {
    if (unit.locked) return;
    setNotice(null);
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (shift && lastClicked.current && lastClicked.current !== unit.id) {
        // Shift-click selects every still-free flat between the two taps.
        const ids = allUnits.map((u) => u.id);
        const a = ids.indexOf(lastClicked.current);
        const b = ids.indexOf(unit.id);
        if (a >= 0 && b >= 0) {
          for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) {
            const u = unitsById.get(id);
            if (u && !u.ownerKey) next.add(id);
          }
          return next;
        }
      }
      if (next.has(unit.id)) next.delete(unit.id);
      else next.add(unit.id);
      return next;
    });
    lastClicked.current = unit.id;
  }

  function toggleParking(id: string) {
    setNotice(null);
    setSelectedParking((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedUnits(new Set());
    setSelectedParking(new Set());
    setNotice(null);
  }

  // Flat sizes in this project (free flats only), for "select every free 1,370 sqft flat" in one tap.
  const sizeGroups = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const u of allUnits) if (!u.ownerKey && u.sqft > 0) map.set(u.sqft, [...(map.get(u.sqft) ?? []), u.id]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [allUnits]);

  function toggleSize(ids: string[]) {
    setNotice(null);
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      const allOn = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  // Flat sizes: by position letter (every A, every B…) or one flat at a time.
  const [sizesOpen, setSizesOpen] = useState(false);
  const [posSizes, setPosSizes] = useState<Record<string, string>>({});
  const [oneSizes, setOneSizes] = useState<Record<string, string>>({});
  const [sizeNote, setSizeNote] = useState<{ ok: boolean; text: string } | null>(null);
  const positions = useMemo(() => {
    const map = new Map<string, BoardUnit[]>();
    for (const u of allUnits) {
      const m = /([A-Za-z]+)$/.exec(u.number.trim());
      if (!m) continue;
      const key = m[1].toUpperCase();
      map.set(key, [...(map.get(key) ?? []), u]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allUnits]);

  function saveSizes() {
    const sizes: Record<string, number> = {};
    for (const [key, text] of Object.entries(posSizes)) {
      if (text.trim() === "") continue;
      const n = Number(text.replace(/,/g, ""));
      for (const u of positions.find(([k]) => k === key)?.[1] ?? []) sizes[u.id] = n;
    }
    for (const [id, text] of Object.entries(oneSizes)) {
      if (text.trim() === "") continue;
      sizes[id] = Number(text.replace(/,/g, ""));
    }
    if (Object.keys(sizes).length === 0) return;
    setSizeNote(null);
    startTransition(async () => {
      const result = await setFlatSizes(projectId, sizes);
      if (result.error) setSizeNote({ ok: false, text: result.error });
      else {
        setSizeNote({ ok: true, text: `Saved — ${result.changed ?? 0} flat${result.changed === 1 ? "" : "s"} changed.` });
        setPosSizes({});
        setOneSizes({});
        router.refresh();
      }
    });
  }

  function selectAllFree() {
    setSelectedUnits(new Set(allUnits.filter((u) => !u.ownerKey).map((u) => u.id)));
    setNotice(null);
  }

  function finish(result: { done: number; problems: string[] }, verb: string) {
    if (result.problems.length > 0) setNotice({ tone: "error", lines: [result.done > 0 ? `${verb} ${result.done}, but some were skipped:` : "Nothing was changed:", ...result.problems] });
    else setNotice({ tone: "ok", lines: [`${verb} ${result.done} item${result.done === 1 ? "" : "s"}.`] });
    clearSelectionKeepNotice();
    router.refresh();
  }

  function clearSelectionKeepNotice() {
    setSelectedUnits(new Set());
    setSelectedParking(new Set());
  }

  function handleGive() {
    if (!person) return;
    const unitIds = freeSelectedUnits.map((u) => u.id);
    const parkingIds = freeSelectedParking.map((p) => p.id);
    if (unitIds.length + parkingIds.length === 0) return;
    startTransition(async () => {
      const result = await distributeToOwner(projectId, person.target, unitIds, parkingIds);
      finish(result, `Gave ${person.name}`);
    });
  }

  function handleMove() {
    if (!person) return;
    const unitIds = movingUnits.map((u) => u.id);
    const parkingIds = movingParking.map((p) => p.id);
    if (unitIds.length + parkingIds.length === 0) return;
    startTransition(async () => {
      const result = await moveToOwner(projectId, person.target, unitIds, parkingIds);
      finish(result, `Moved to ${person.name}:`);
    });
  }

  function handleRelease() {
    const unitIds = ownedSelectedUnits.map((u) => u.id);
    const parkingIds = ownedSelectedParking.map((p) => p.id);
    if (unitIds.length + parkingIds.length === 0) return;
    if (!window.confirm(`Take ${unitIds.length + parkingIds.length} item(s) back from their current owners?`)) return;
    startTransition(async () => {
      const result = await releaseFromOwners(projectId, unitIds, parkingIds);
      finish(result, "Took back");
    });
  }

  const giveCount = freeSelectedUnits.length + freeSelectedParking.length;
  const moveCount = movingUnits.length + movingParking.length;
  const releaseCount = ownedSelectedUnits.length + ownedSelectedParking.length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Panel: who gets it + the live result. Above the board on phones so it is never lost below a long grid. */}
      <aside className="order-first flex flex-col gap-4 lg:order-last">
        <div className="border-border bg-surface-raised flex flex-col gap-3 rounded-xl border p-4">
          <h2 className="text-label text-fg-subtle uppercase">1 · Who gets them?</h2>
          {people.length === 0 ? (
            <p className="text-body-sm text-fg-muted">
              No shareholder or landowner is linked to this project yet. Add a shareholding or a landowner agreement first, then they appear here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersonId(p.id)}
                  aria-pressed={personId === p.id}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-95",
                    personId === p.id ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-surface hover:border-accent",
                  )}
                >
                  <span className="text-body-sm block font-medium leading-tight">{p.name}</span>
                  <span className={cn("text-caption block leading-tight", personId === p.id ? "text-accent-foreground/75" : "text-fg-subtle")}>{p.roleLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-4 rounded-xl border p-4">
          <h2 className="text-label text-fg-subtle uppercase">2 · Live result</h2>
          {person ? (
            <div className="flex flex-col gap-3">
              <p className="text-body font-semibold">{person.name}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Flats" value={currentUnitCount + incomingUnits.length} added={incomingUnits.length} />
                <Stat label="Sqft" value={currentSqft + incomingSqft} added={incomingSqft} />
                <Stat label="Parking" value={currentParking + freeSelectedParking.length + movingParking.length} added={freeSelectedParking.length + movingParking.length} />
              </div>
              {(current?.units.length ?? 0) + incomingUnits.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {current?.units.map((u) => (
                    <span key={u.id} className="bg-surface text-fg-muted text-caption rounded-md px-2 py-1">
                      {u.number} · {formatSqft(u.sqft)}
                    </span>
                  ))}
                  {incomingUnits.map((u) => (
                    <span key={u.id} className="bg-accent-soft text-accent text-caption rounded-md px-2 py-1 font-medium">
                      + {u.number} · {formatSqft(u.sqft)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-body-sm text-fg-muted">Pick a person above.</p>
          )}

          <div className="flex flex-col gap-2">
            <Button type="button" onClick={handleGive} loading={isPending} disabled={!person || giveCount === 0} className="w-full">
              <Check aria-hidden className="size-4" />
              {giveCount === 0 ? "Tap flats to select" : `Give ${giveCount} to ${person?.name.split(" ")[0] ?? "…"}`}
            </Button>
            {moveCount > 0 && (
              <Button type="button" onClick={handleMove} loading={isPending} disabled={!person} className="w-full">
                <ArrowRightLeft aria-hidden className="size-4" />
                Move {moveCount} to {person?.name.split(" ")[0] ?? "…"} instead
              </Button>
            )}
            {releaseCount > 0 && (
              <Button type="button" variant="outline" onClick={handleRelease} loading={isPending} className="w-full">
                <Undo2 aria-hidden className="size-4" />
                Just take {releaseCount} back (no new owner)
              </Button>
            )}
            {(selectedUnits.size > 0 || selectedParking.size > 0) && (
              <button type="button" onClick={clearSelection} className="text-body-sm text-fg-muted hover:text-fg inline-flex items-center justify-center gap-1.5 py-1 transition-colors">
                <X aria-hidden className="size-3.5" />
                Clear selection
              </button>
            )}
          </div>

          {notice && (
            <div role="status" className={cn("text-body-sm flex flex-col gap-1 rounded-md px-3 py-2.5", notice.tone === "ok" ? "bg-success-soft text-success" : "bg-error-soft text-error")}>
              {notice.lines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
        </div>

        <div className="border-border bg-surface-raised flex flex-col gap-2 rounded-xl border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Everyone so far</h2>
          {[...summary.entries()].filter(([, r]) => r.units.length > 0 || r.parking > 0).length === 0 ? (
            <p className="text-body-sm text-fg-muted">Nothing handed out yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {[...summary.entries()]
                .filter(([, r]) => r.units.length > 0 || r.parking > 0)
                .map(([key, r]) => (
                  <li key={key} className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", toneByOwner.get(key))} />
                      <span className="text-body-sm truncate">{r.name}</span>
                    </span>
                    <span className="text-caption text-fg-muted shrink-0 text-right">
                      {r.units.length} flat{r.units.length === 1 ? "" : "s"} · {formatSqft(r.units.reduce((s, u) => s + u.sqft, 0))} sqft
                      {r.parking > 0 ? ` · ${r.parking} parking` : ""}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <p className="text-caption text-fg-subtle mt-1">
            Still free: {totalFree} flat{totalFree === 1 ? "" : "s"}
            {parking.length > 0 ? `, ${totalFreeParking} parking` : ""}.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col gap-7">
        {canEditSizes && allUnits.length > 0 && (
          <div className="border-border bg-surface-raised rounded-xl border p-4">
            <button type="button" onClick={() => setSizesOpen((v) => !v)} aria-expanded={sizesOpen} className="flex w-full items-center justify-between gap-3 text-left">
              <span>
                <span className="text-label text-fg-subtle block uppercase">Flat sizes</span>
                <span className="text-body-sm text-fg-muted">Set sqft for every A flat, every B flat… or one flat at a time.</span>
              </span>
              <span className="text-accent shrink-0 text-sm font-semibold">{sizesOpen ? "Close" : "Edit sizes"}</span>
            </button>
            {sizesOpen && (
              <div className="mt-4 flex flex-col gap-4">
                {positions.length > 1 && (
                  <div>
                    <p className="text-caption text-fg-subtle mb-2 uppercase">By position — fills every flat with that letter</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {positions.map(([key, list]) => (
                        <label key={key} className="text-caption text-fg-subtle flex flex-col gap-1">
                          Every {key} ({list.length})
                          <input
                            inputMode="numeric"
                            value={posSizes[key] ?? ""}
                            onChange={(e) => setPosSizes((p) => ({ ...p, [key]: e.target.value }))}
                            placeholder={formatSqft(list[0].sqft)}
                            className="text-body-sm border-border-strong bg-surface text-fg h-10 rounded-md border px-3 outline-none focus:border-accent"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-caption text-fg-subtle mb-2 uppercase">One flat at a time — wins over the position above</p>
                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
                    {allUnits.map((u) => (
                      <label key={u.id} className="text-caption text-fg-subtle flex flex-col gap-1">
                        {u.number}
                        <input
                          inputMode="numeric"
                          value={oneSizes[u.id] ?? ""}
                          onChange={(e) => setOneSizes((p) => ({ ...p, [u.id]: e.target.value }))}
                          placeholder={formatSqft(u.sqft)}
                          className="text-body-sm border-border-strong bg-surface text-fg h-9 rounded-md border px-2 outline-none focus:border-accent"
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" size="sm" onClick={saveSizes} loading={isPending} disabled={Object.values(posSizes).every((v) => !v.trim()) && Object.values(oneSizes).every((v) => !v.trim())}>
                    <Check aria-hidden className="size-4" /> Save sizes
                  </Button>
                  {sizeNote && <span className={cn("text-body-sm", sizeNote.ok ? "text-success" : "text-error")}>{sizeNote.text}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAllFree} disabled={totalFree === 0}>
            Select all free flats
          </Button>
          {sizeGroups.length > 1 && (
            <div className="flex w-full flex-wrap items-center gap-2">
              <span className="text-caption text-fg-subtle uppercase">Select by size</span>
              {sizeGroups.map(([size, ids]) => {
                const on = ids.every((id) => selectedUnits.has(id));
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSize(ids)}
                    className={cn("text-body-sm rounded-full border px-3 py-1 transition-colors active:scale-95", on ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-surface-raised hover:border-accent")}
                  >
                    {formatSqft(size)} sqft <span className="opacity-70">· {ids.length} free</span>
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-caption text-fg-subtle">Tap to select. Shift-tap a second flat to select everything between. Given to the wrong person? Tap their coloured flat, pick the right person, press Move.</p>
        </div>

        {groups.every((g) => g.units.length === 0) ? (
          <p className="text-body-sm text-fg-muted">This project has no flats yet — add them under Units first.</p>
        ) : (
          groups.map((group) =>
            group.units.length === 0 ? null : (
              <section key={group.label} className="flex flex-col gap-2.5">
                <h3 className="text-label text-fg-subtle flex items-center gap-1.5 uppercase">
                  <Home aria-hidden className="size-3.5" />
                  {group.label}
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2.5">
                  {group.units.map((unit) => {
                    const selected = selectedUnits.has(unit.id);
                    const owned = !!unit.ownerKey;
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        disabled={unit.locked}
                        onClick={(e) => toggleUnit(unit, e.shiftKey)}
                        aria-pressed={selected}
                        title={owned ? `${unit.number} — ${unit.ownerLabel ?? "owned"}${unit.locked ? " (sold)" : ""}` : `${unit.number} — free`}
                        className={cn(
                          "relative flex min-h-[4.5rem] flex-col items-start justify-between rounded-lg border p-2 text-left transition-[transform,box-shadow,background-color,border-color] duration-200",
                          !unit.locked && "active:scale-90",
                          selected
                            ? "border-accent bg-accent text-accent-foreground scale-[1.04] shadow-md"
                            : owned
                              ? cn("border-transparent", toneByOwner.get(unit.ownerKey!) ?? "bg-surface text-fg-muted")
                              : "border-border-strong bg-surface-raised text-fg hover:border-accent hover:-translate-y-0.5",
                          unit.locked && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <span className="text-body-sm font-semibold leading-none">{unit.number}</span>
                        <span className="text-caption leading-tight">
                          {formatSqft(unit.sqft)} sqft
                          {owned && <span className="block max-w-full truncate font-medium">{unit.ownerLabel}</span>}
                        </span>
                        {unit.locked && <Lock aria-hidden className="absolute top-1.5 right-1.5 size-3 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            ),
          )
        )}

        {(["car", "bike"] as const).map((kind) => {
          const spaces = parking.filter((p) => (p.kind ?? "car") === kind);
          if (spaces.length === 0) return null;
          return (
          <section key={kind} className="flex flex-col gap-2.5">
            <h3 className="text-label text-fg-subtle flex items-center gap-1.5 uppercase">
              <Car aria-hidden className="size-3.5" />
              {kind === "bike" ? "Motorcycle parking" : parking.some((p) => p.kind === "bike") ? "Car parking" : "Parking"}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-2.5">
              {spaces.map((space) => {
                const selected = selectedParking.has(space.id);
                const owned = !!space.ownerKey;
                return (
                  <button
                    key={space.id}
                    type="button"
                    disabled={!canAssignParking}
                    onClick={() => toggleParking(space.id)}
                    aria-pressed={selected}
                    title={owned ? `Parking ${space.number} — ${space.ownerLabel ?? "owned"}` : `Parking ${space.number} — free`}
                    className={cn(
                      "flex min-h-[3.5rem] flex-col items-start justify-between rounded-lg border p-2 text-left transition-[transform,box-shadow,background-color,border-color] duration-200 active:scale-90",
                      selected
                        ? "border-accent bg-accent text-accent-foreground scale-[1.04] shadow-md"
                        : owned
                          ? cn("border-transparent", toneByOwner.get(space.ownerKey!) ?? "bg-surface text-fg-muted")
                          : "border-border-strong bg-surface-raised text-fg hover:border-accent hover:-translate-y-0.5",
                      !canAssignParking && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="text-body-sm font-semibold leading-none">{/^\d+$/.test(space.number) ? `P-${space.number}` : space.number}</span>
                    <span className="text-caption max-w-full truncate leading-tight">{owned ? space.ownerLabel : "Free"}</span>
                  </button>
                );
              })}
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, added }: { label: string; value: number; added: number }) {
  return (
    <div className="bg-surface rounded-lg px-2 py-2.5">
      <p className="text-h4 font-semibold tabular-nums leading-none">
        <AnimatedNumber value={value} />
      </p>
      <p className="text-caption text-fg-subtle mt-1">{label}</p>
      <p className={cn("text-caption h-4 font-medium transition-opacity duration-200", added > 0 ? "text-accent opacity-100" : "opacity-0")}>+{formatSqft(added)}</p>
    </div>
  );
}
