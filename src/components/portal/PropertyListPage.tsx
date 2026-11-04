import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { resolveOwnerContext } from "@/lib/ownerContext";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Media } from "@/components/ui/Media";
import { StatusBadge } from "@/components/ui/Badge";
import { getOwnerUnits } from "@/features/ownerPortal/queries";
import { projectRepository } from "@/features/projects/repository";
import { resolveUnitPlan } from "@/lib/unitPlan";

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

  const units = await getOwnerUnits(context.ownerType, context.ownerId);

  if (units.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <EmptyState title="No property is linked to your account yet" description="Once a unit is assigned to you, it will appear here." />
      </div>
    );
  }

  const projects = await projectRepository.list();
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-10">
      <div>
        <p className="text-label text-fg-subtle uppercase">My Properties</p>
        <h1 className="text-h2 text-fg mt-1">{units.length} {units.length === 1 ? "Property" : "Properties"}</h1>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {units.map((unit) => {
          const project = projectsById.get(unit.projectId);
          return (
            <Link
              key={unit.id}
              href={`${base}/property/${unit.id}`}
              className="border-border bg-surface-raised hover:border-fg-subtle group overflow-hidden rounded-2xl border transition-colors"
            >
              <Media src={resolveUnitPlan(unit, projectsById.get(unit.projectId)).src ?? "/placeholder-image.png"} alt={unit.unitNumber} ratio="standard" />
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
    </div>
  );
}
