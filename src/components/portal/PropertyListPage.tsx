import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { BlueprintPaper } from "@/components/portal/BlueprintPaper";
import { StatusBadge } from "@/components/ui/Badge";
import { Car } from "lucide-react";
import { getOwnerUnits, getOwnerParking } from "@/features/ownerPortal/queries";
import { PARKING_TYPE_MAP } from "@/lib/parkingTypeIcons";
import { projectRepository } from "@/features/projects/repository";
import { resolveUnitPlan, resolveParkingPlan } from "@/lib/unitPlan";
import { getFloorNumbers } from "@/features/floors/floorNumbers";

/**
 * "My Properties" (Prompt 1 §"if one owner owns multiple properties…").
 * One unit redirects straight into its detail page rather than showing a
 * pointless list-of-one; multiple units show a real switcher.
 */
export async function PropertyListPage({ base }: { base: string }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const context = resolveOwnerContext(user);
  if (!context) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property linked yet" description="Please contact Shopno Bilash Properties Ltd. to complete your account setup." />
      </div>
    );
  }

  const [units, parking] = await Promise.all([getOwnerUnits(context.ownerType, context.ownerId), getOwnerParking(context.ownerType, context.ownerId)]);

  if (units.length === 0 && parking.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property is linked to your account yet" description="Once a unit is assigned to you, it will appear here." />
      </div>
    );
  }

  const [projects, floorNumbers] = await Promise.all([projectRepository.list(), getFloorNumbers()]);
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const parkingByProject = new Map<string, typeof parking>();
  for (const space of parking) {
    const list = parkingByProject.get(space.projectId) ?? [];
    list.push(space);
    parkingByProject.set(space.projectId, list);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <div>
        <p className="text-label text-fg-subtle uppercase">My Properties</p>
        <h1 className="text-h2 text-fg mt-1">
          {units.length} {units.length === 1 ? "Property" : "Properties"}
          {parking.length > 0 && <span className="text-fg-muted"> · {parking.length} parking {parking.length === 1 ? "space" : "spaces"}</span>}
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {units.map((unit) => {
          const project = projectsById.get(unit.projectId);
          const plan = resolveUnitPlan(unit, project, floorNumbers[unit.floorId], { forOwner: true });
          return (
            <Link
              key={unit.id}
              href={`${base}/property/${unit.id}`}
              className="bg-surface-raised group overflow-hidden rounded-[1.75rem] shadow-[0_1px_2px_rgb(var(--shadow-color)/0.06),0_14px_32px_-12px_rgb(var(--shadow-color)/0.22)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-standard)] active:scale-[0.99] lg:hover:-translate-y-0.5"
            >
              <BlueprintPaper
                src={plan.src}
                highlight={plan.highlight}
                alt={`Floor plan of unit ${unit.unitNumber}`}
                title={`Unit ${unit.unitNumber}`}
                meta={[unit.sizeSqft > 0 ? `${unit.sizeSqft.toLocaleString("en-US")} sqft` : null, unit.bedrooms > 0 ? `${unit.bedrooms} bed` : null].filter(Boolean).join(" · ")}
                className="aspect-[4/3]"
              />
              <div className="flex items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-h4 text-fg">{unit.unitNumber}</p>
                  <p className="text-body-sm text-fg-muted mt-0.5">{project?.name ?? "—"}</p>
                </div>
                <StatusBadge status={unit.status} />
              </div>
            </Link>
          );
        })}
      </div>

      {parking.length > 0 && (
        <section aria-label="My parking" className="flex flex-col gap-4">
          <p className="text-label text-fg-subtle uppercase">My Parking</p>
          {[...parkingByProject.entries()].map(([projectId, spaces]) => {
            const parkingPlan = resolveParkingPlan(spaces, projectsById.get(projectId));
            return (
            <div key={projectId} className="border-border bg-surface-raised rounded-2xl border p-5 shadow-sm">
              <p className="text-body text-fg font-semibold">{projectsById.get(projectId)?.name ?? "—"}</p>
              <p className="text-caption text-fg-subtle mt-0.5">
                {spaces.length} {spaces.length === 1 ? "space" : "spaces"}
              </p>
              {parkingPlan && (
                // The parking level with this owner's own bays lit and the other bays dimmed.
                <BlueprintPaper src={parkingPlan.src} alt="Parking plan" highlight={parkingPlan.highlight} className="mt-4 aspect-[4/3] rounded-xl" />
              )}
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {spaces
                  .slice()
                  .sort((a, b) => a.parkingNumber.localeCompare(b.parkingNumber, "en", { numeric: true }))
                  .map((space) => {
                    const Icon = space.type ? PARKING_TYPE_MAP[space.type].icon : Car;
                    return (
                      <li key={space.id} className="bg-surface flex items-center gap-3 rounded-xl px-3.5 py-3">
                        <span className="bg-accent-soft text-accent flex size-9 shrink-0 items-center justify-center rounded-full">
                          <Icon aria-hidden className="size-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className="text-body-sm text-fg block font-semibold">{space.parkingNumber}</span>
                          <span className="text-caption text-fg-subtle block truncate">
                            {space.type ? PARKING_TYPE_MAP[space.type].label : "Parking"}
                            {space.zone ? ` · ${space.zone}` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
