import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DistributionBoard, type BoardParking, type BoardPerson, type BoardUnitGroup } from "@/components/admin/projects/DistributionBoard";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { parkingRepository } from "@/features/parking/repository";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { resolveUnitOwner } from "@/features/ownership/resolveUnitOwner";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

const natural = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * "Distribute" — hand the project's flats and parking spaces to its
 * shareholders and landowners by tapping them (see `DistributionBoard`).
 * Writes go through `features/ownership/distributeActions.ts`, which reuses
 * the existing one-at-a-time assign actions, so ownership history and the
 * shareholding/allocation records stay exactly as they were.
 */
export default async function ProjectDistributePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "unit.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Units." />
      </div>
    );
  }

  const canShareholders = hasPermission(user.role, "shareholder.manage");
  const canLandowners = hasPermission(user.role, "landowner.manage");

  let loaded;
  try {
    const found = await projectRepository.findById(id);
    if (found) {
      const [buildings, floors, units, parkingAll, customers, shareholders, shareholdings, landowners, agreements] = await Promise.all([
        buildingRepository.list(),
        floorRepository.list(),
        unitRepository.list(),
        parkingRepository.list(),
        customerRepository.list(),
        shareholderRepository.list(),
        shareholdingRepository.list(),
        landownerRepository.list(),
        agreementRepository.list(),
      ]);
      loaded = { project: found, buildings, floors, units, parkingAll, customers, shareholders, shareholdings, landowners, agreements };
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This project's units couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!loaded) notFound();
  const { project } = loaded;
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const shareholderName = new Map(loaded.shareholders.map((s) => [s.id, s.name]));
  const landownerName = new Map(loaded.landowners.map((l) => [l.id, l.name]));
  const customerName = new Map(loaded.customers.map((c) => [c.id, c.name]));

  const people: BoardPerson[] = [];
  if (canShareholders) {
    for (const h of loaded.shareholdings.filter((x) => x.projectId === id)) {
      const name = shareholderName.get(h.shareholderId);
      if (!name) continue;
      people.push({
        id: `holding:${h.id}`,
        ownerKey: `shareholder:${h.shareholderId}`,
        name,
        roleLabel: "Shareholder",
        target: { kind: "shareholder", shareholderId: h.shareholderId, shareholdingId: h.id },
      });
    }
  }
  if (canLandowners) {
    for (const a of loaded.agreements.filter((x) => x.projectId === id)) {
      const name = landownerName.get(a.landownerId);
      if (!name) continue;
      people.push({
        id: `agreement:${a.id}`,
        ownerKey: `landowner:${a.landownerId}`,
        name,
        roleLabel: "Landowner",
        target: { kind: "landowner", landownerId: a.landownerId, agreementId: a.id },
      });
    }
  }

  function labelFor(ownerType: string, ownerId: string): string {
    if (ownerType === "shareholder") return shareholderName.get(ownerId) ?? "Shareholder";
    if (ownerType === "landowner") return landownerName.get(ownerId) ?? "Landowner";
    return customerName.get(ownerId) ?? "Customer";
  }

  const projectUnits = loaded.units.filter((u) => u.projectId === id);
  const unitView = new Map<string, BoardUnitGroup["units"][number]>();
  for (const unit of projectUnits) {
    const ref = await resolveUnitOwner(unit);
    unitView.set(unit.id, {
      id: unit.id,
      number: unit.unitNumber,
      sqft: unit.sizeSqft,
      ownerKey: ref ? `${ref.ownerType}:${ref.ownerId}` : undefined,
      ownerLabel: ref ? labelFor(ref.ownerType, ref.ownerId) : undefined,
      locked: ref?.ownerType === "customer",
    });
  }

  // Building → floor order, then flat number in natural order (A-2 before A-10).
  const groups: BoardUnitGroup[] = [];
  const buildings = loaded.buildings.filter((b) => b.projectId === id).sort((a, b) => natural.compare(a.name, b.name));
  const multipleBuildings = buildings.length > 1;
  const placed = new Set<string>();
  for (const building of buildings) {
    const floors = loaded.floors.filter((f) => f.buildingId === building.id).sort((a, b) => a.floorNumber - b.floorNumber);
    for (const floor of floors) {
      const floorUnits = projectUnits.filter((u) => u.floorId === floor.id).sort((a, b) => natural.compare(a.unitNumber, b.unitNumber));
      floorUnits.forEach((u) => placed.add(u.id));
      groups.push({ label: multipleBuildings ? `${building.name} · ${floor.label}` : floor.label, units: floorUnits.map((u) => unitView.get(u.id)!) });
    }
  }
  const loose = projectUnits.filter((u) => !placed.has(u.id)).sort((a, b) => natural.compare(a.unitNumber, b.unitNumber));
  if (loose.length > 0) groups.push({ label: groups.length > 0 ? "Other flats" : "Flats", units: loose.map((u) => unitView.get(u.id)!) });

  const parking: BoardParking[] = loaded.parkingAll
    .filter((p) => p.projectId === id)
    .sort((a, b) => natural.compare(a.parkingNumber, b.parkingNumber))
    .map((p) => ({
      id: p.id,
      number: p.parkingNumber,
      ownerKey: p.ownerType && p.ownerId ? `${p.ownerType}:${p.ownerId}` : undefined,
      ownerLabel: p.ownerType && p.ownerId ? labelFor(p.ownerType, p.ownerId) : undefined,
    }));

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <p className="text-body-sm text-fg-muted max-w-2xl">
        Pick who receives, tap their flats and parking spaces, and watch their total change before you save. Flats already sold to a customer are locked.
      </p>
      <DistributionBoard projectId={id} groups={groups} parking={parking} people={people} canAssignParking={hasPermission(user.role, "parking.manage")} />
    </div>
  );
}
