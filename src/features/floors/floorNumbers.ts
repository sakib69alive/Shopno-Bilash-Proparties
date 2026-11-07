import { floorRepository } from "@/features/floors/repository";

/** floorId → floor number (ground = 0), for pages that must pick the right whole-floor plan for each flat. */
export async function getFloorNumbers(): Promise<Record<string, number>> {
  const floors = await floorRepository.list();
  return Object.fromEntries(floors.map((f) => [f.id, f.floorNumber]));
}
