"use server";

import { revalidatePath } from "next/cache";
import { assignUnitToShareholding, unassignUnitFromShareholding } from "@/features/shareholders/shareholdingActions";
import { createLandownerAllocation, deleteLandownerAllocationByUnit } from "@/features/landowners/landownerAllocationActions";
import { assignParkingToOwner, releaseParkingFromOwner } from "@/features/parking/actions";
import { shareholdingRepository } from "@/features/shareholders/repository";
import { landownerAllocationRepository } from "@/features/landowners/repository";
import { unitRepository } from "@/features/units/repository";
import { parkingRepository } from "@/features/parking/repository";

/** Who receives the units: a shareholder's stake in this project, or a landowner's agreement for it. */
export type DistributeTarget =
  | { kind: "shareholder"; shareholderId: string; shareholdingId: string }
  | { kind: "landowner"; landownerId: string; agreementId: string };

export interface DistributeResult {
  /** How many units + parking spaces were actually changed. */
  done: number;
  /** Plain-language reasons for anything that was skipped. */
  problems: string[];
  /** Set by release: which items were actually taken back (so a move only re-assigns those). */
  releasedUnitIds?: string[];
  releasedParkingIds?: string[];
}

function message(error: unknown): string {
  return error instanceof Error && error.message === "Forbidden" ? "You don't have permission to do this." : "Something went wrong.";
}

/**
 * The "give these flats and parking spaces to this person" batch behind the
 * Distribute board. It only loops over the existing single-item actions —
 * those still do every ownership check, write the history trail and sync
 * the shareholding/allocation records — so the board can never end up with
 * an ownership state the old one-at-a-time screens couldn't produce. Run one
 * after another (not in parallel) because they each read-modify-write the
 * same shareholding record.
 */
export async function distributeToOwner(projectId: string, target: DistributeTarget, unitIds: string[], parkingIds: string[]): Promise<DistributeResult> {
  const result: DistributeResult = { done: 0, problems: [] };

  for (const unitId of unitIds) {
    const unit = await unitRepository.findById(unitId);
    const label = unit?.unitNumber ?? "A unit";
    try {
      const outcome =
        target.kind === "shareholder"
          ? await assignUnitToShareholding(target.shareholderId, target.shareholdingId, unitId)
          : await createLandownerAllocation(target.landownerId, target.agreementId, unitId);
      if (outcome.error) result.problems.push(`${label}: ${outcome.error}`);
      else result.done += 1;
    } catch (error) {
      result.problems.push(`${label}: ${message(error)}`);
    }
  }

  for (const parkingId of parkingIds) {
    const parking = await parkingRepository.findById(parkingId);
    const label = parking ? `Parking ${parking.parkingNumber}` : "A parking space";
    try {
      const ownerId = target.kind === "shareholder" ? target.shareholderId : target.landownerId;
      const outcome = await assignParkingToOwner(parkingId, target.kind, ownerId);
      if (outcome.error) result.problems.push(`${label}: ${outcome.error}`);
      else result.done += 1;
    } catch (error) {
      result.problems.push(`${label}: ${message(error)}`);
    }
  }

  revalidatePath(`/admin/projects/${projectId}/distribute`);
  revalidatePath(`/admin/projects/${projectId}/units`);
  revalidatePath(`/admin/projects/${projectId}/owners`);
  return result;
}

/** Takes units/parking back from a shareholder or landowner so they can be handed to someone else. Sold flats (owned by a customer) are never touched here — those are managed through Sales. */
export async function releaseFromOwners(projectId: string, unitIds: string[], parkingIds: string[]): Promise<DistributeResult> {
  const result: DistributeResult = { done: 0, problems: [], releasedUnitIds: [], releasedParkingIds: [] };

  for (const unitId of unitIds) {
    const unit = await unitRepository.findById(unitId);
    if (!unit) continue;
    try {
      if (unit.customerId) {
        result.problems.push(`${unit.unitNumber}: sold to a customer — change it in Sales.`);
      } else if (unit.shareholderId) {
        const holdings = await shareholdingRepository.list();
        const holding = holdings.find((h) => h.allocatedUnitIds.includes(unitId));
        if (!holding) {
          result.problems.push(`${unit.unitNumber}: its shareholding record couldn't be found.`);
          continue;
        }
        await unassignUnitFromShareholding(holding.shareholderId, holding.id, unitId);
        result.done += 1;
        result.releasedUnitIds?.push(unitId);
      } else if (unit.landownerAllocationId) {
        const allocation = await landownerAllocationRepository.findById(unit.landownerAllocationId);
        if (!allocation) {
          result.problems.push(`${unit.unitNumber}: its landowner allocation couldn't be found.`);
          continue;
        }
        await deleteLandownerAllocationByUnit(allocation.landownerId, unitId);
        result.done += 1;
        result.releasedUnitIds?.push(unitId);
      }
    } catch (error) {
      result.problems.push(`${unit.unitNumber}: ${message(error)}`);
    }
  }

  for (const parkingId of parkingIds) {
    try {
      await releaseParkingFromOwner(parkingId);
      result.done += 1;
      result.releasedParkingIds?.push(parkingId);
    } catch (error) {
      result.problems.push(`Parking: ${message(error)}`);
    }
  }

  revalidatePath(`/admin/projects/${projectId}/distribute`);
  revalidatePath(`/admin/projects/${projectId}/units`);
  revalidatePath(`/admin/projects/${projectId}/owners`);
  return result;
}

/**
 * "Given to the wrong person" fix in one step: takes each item back from its
 * current owner, then gives exactly the ones that came back to the new
 * person. Anything that couldn't be released (e.g. sold to a customer) is
 * left where it was and reported.
 */
export async function moveToOwner(projectId: string, target: DistributeTarget, unitIds: string[], parkingIds: string[]): Promise<DistributeResult> {
  const released = await releaseFromOwners(projectId, unitIds, parkingIds);
  const given = await distributeToOwner(projectId, target, released.releasedUnitIds ?? [], released.releasedParkingIds ?? []);
  return { done: given.done, problems: [...released.problems, ...given.problems] };
}
