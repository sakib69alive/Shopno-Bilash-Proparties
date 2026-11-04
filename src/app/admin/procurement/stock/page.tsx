import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ProjectFilterSelect } from "@/components/admin/procurement/ProjectFilterSelect";
import { MaterialThresholdControl } from "@/components/admin/procurement/MaterialThresholdControl";
import { formatNumber } from "@/lib/format";
import { summarizeStock, isLowStock } from "@/lib/materialStock";
import {
  stockMovementRepository,
  materialRepository,
  materialCategoryRepository,
  materialThresholdRepository,
} from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Current stock is never stored — this page fetches every movement for the
 * selected project and recomputes each material's opening/received/used/
 * wastage/current via `summarizeStock` on every load, the same
 * derive-at-read-time approach the Cost Allocation contributions use.
 */
export default async function AdminStockPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view stock." />
      </div>
    );
  }

  let projects, materials, categories, movements, thresholds;
  try {
    const [allProjects, allMaterials, allCategories, allThresholds] = await Promise.all([
      projectRepository.list(),
      materialRepository.list(),
      materialCategoryRepository.list(),
      materialThresholdRepository.list(),
    ]);
    projects = filterVisibleProjectsList(user, allProjects);
    materials = allMaterials.filter((m) => m.status !== "inactive");
    categories = allCategories;
    thresholds = allThresholds;
    movements = await stockMovementRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Stock couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "procurement.manage");
  // A requested project outside the viewer's visible set is ignored, not honored — falls back to
  // their own first visible project rather than ever revealing another project's stock.
  const projectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : projects[0]?.id;
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const projectMovements = movements.filter((m) => m.projectId === projectId);
  const thresholdByMaterial = new Map(thresholds.filter((t) => t.projectId === projectId).map((t) => [t.materialId, t.minimumStock]));

  return (
    <>
      <AdminPageHeader
        title="Stock"
        description="Opening, received, used and wastage per material, computed from the movement ledger."
        primaryAction={
          canManage &&
          projectId && (
            <Link href={`/admin/procurement/stock/new?projectId=${projectId}`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              Record Movement
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {projects.length === 0 ? (
          <EmptyState title="No projects yet" description="Add a project before tracking its material stock." />
        ) : (
          <ProjectFilterSelect projects={projects} value={projectId} basePath="/admin/procurement/stock" />
        )}

        {projectId && materials.length === 0 && (
          <EmptyState
            title="No materials yet"
            description="Add a material to start tracking its stock."
            action={
              <Link href="/admin/procurement/materials" className={buttonVariants({ variant: "outline", size: "md" })}>
                Go to Materials
              </Link>
            }
          />
        )}

        {projectId && materials.length > 0 && (
          <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-3 font-normal">Material</th>
                  <th className="px-4 py-3 font-normal">Category</th>
                  <th className="px-4 py-3 text-right font-normal">Opening</th>
                  <th className="px-4 py-3 text-right font-normal">Received</th>
                  <th className="px-4 py-3 text-right font-normal">Used</th>
                  <th className="px-4 py-3 text-right font-normal">Wastage</th>
                  <th className="px-4 py-3 text-right font-normal">Current Stock</th>
                  <th className="px-4 py-3 font-normal">Min. Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => {
                  const materialMovements = projectMovements.filter((m) => m.materialId === material.id);
                  const summary = summarizeStock(materialMovements);
                  const category = categoriesById.get(material.categoryId);
                  const threshold = thresholdByMaterial.get(material.id);
                  const low = isLowStock(summary.currentStock, threshold);
                  return (
                    <tr key={material.id} className={`border-border text-body-sm border-b last:border-b-0 ${low ? "bg-error-soft/40" : ""}`}>
                      <td className="px-4 py-3 text-fg">{material.name}</td>
                      <td className="px-4 py-3 text-fg-muted">{category?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(summary.opening)} {material.unit}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(summary.received)} {material.unit}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(summary.used)} {material.unit}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatNumber(summary.wastage)} {material.unit}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium tabular-nums ${low ? "text-error" : "text-fg"}`}>
                        {formatNumber(summary.currentStock)} {material.unit}
                        {low && <span className="text-caption ml-2 font-normal">Low Stock</span>}
                      </td>
                      <td className="px-4 py-3">
                        {canManage && projectId ? (
                          <MaterialThresholdControl projectId={projectId} materialId={material.id} unit={material.unit} currentThreshold={threshold} />
                        ) : (
                          <span className="text-fg-subtle">{threshold !== undefined ? `${formatNumber(threshold)} ${material.unit}` : "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/procurement/stock/ledger?projectId=${projectId}&materialId=${material.id}`}
                          className="text-body-sm text-accent hover:text-accent-strong transition-colors"
                        >
                          Ledger →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
