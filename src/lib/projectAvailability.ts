import type { Project } from "@/content/projects";
import type { Unit } from "@/content/units";

export interface ProjectAvailability {
  /** Units that can be bought right now; undefined when nothing is known. */
  available?: number;
  /** Units in the whole development; undefined when nothing is known. */
  total?: number;
  /** True when the numbers come from real unit records (rather than figures typed on the project). */
  fromUnits: boolean;
}

/**
 * The one place a project's "available / total" is decided. Once a project
 * has unit records, "available" is counted from them — so the number shown
 * can never disagree with the list a visitor opens by tapping it. The
 * project's own typed figures are only a fallback for a project that has no
 * unit records yet, and its typed total is kept as the development's size
 * (never lower than the units actually listed).
 */
export function getProjectAvailability(
  project: Pick<Project, "slug" | "availableUnits" | "totalUnits">,
  units: Pick<Unit, "status" | "projectSlug">[],
): ProjectAvailability {
  const own = units.filter((u) => u.projectSlug === project.slug);
  if (own.length === 0) {
    return { available: project.availableUnits, total: project.totalUnits, fromUnits: false };
  }
  return {
    available: own.filter((u) => u.status === "available").length,
    total: Math.max(project.totalUnits ?? 0, own.length),
    fromUnits: true,
  };
}
