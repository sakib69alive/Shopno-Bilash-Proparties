import { notFound } from "next/navigation";
import Link from "next/link";
import { Boxes, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { formatBDT, formatDate } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import {
  stockMovementRepository,
  materialRepository,
  purchaseRepository,
  materialThresholdRepository,
  vendorRepository,
} from "@/features/procurement/repository";
import { summarizeStock, isLowStock } from "@/lib/materialStock";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * A real project-scoped dashboard, not a link-out shell — reuses
 * `summarizeStock`, the same movement-ledger computation the global Stock
 * page uses, so the numbers here can never drift from it. Full detail
 * (edit, delete, per-material ledger) still lives on the global Procurement
 * pages, reached here pre-filtered to this project.
 */
export default async function ProjectMaterialsPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Materials." />
      </div>
    );
  }

  let project, rows, recentPurchases, recentUsage, purchaseCost, lowStockCount, categoryCount;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      const [movements, materials, purchases, thresholds, vendors] = await Promise.all([
        stockMovementRepository.list(),
        materialRepository.list(),
        purchaseRepository.list(),
        materialThresholdRepository.list(),
        vendorRepository.list(),
      ]);
      const projectMovements = movements.filter((m) => m.projectId === id);
      const materialsById = new Map(materials.map((m) => [m.id, m]));
      const vendorsById = new Map(vendors.map((v) => [v.id, v]));
      const thresholdByMaterial = new Map(thresholds.filter((t) => t.projectId === id).map((t) => [t.materialId, t.minimumStock]));
      const materialIds = [...new Set(projectMovements.map((m) => m.materialId))];

      rows = materialIds
        .map((materialId) => {
          const summary = summarizeStock(projectMovements.filter((m) => m.materialId === materialId));
          return { material: materialsById.get(materialId), summary, threshold: thresholdByMaterial.get(materialId) };
        })
        .filter((r): r is { material: NonNullable<typeof r.material>; summary: typeof r.summary; threshold: number | undefined } => !!r.material);

      lowStockCount = rows.filter((r) => isLowStock(r.summary.currentStock, r.threshold)).length;
      categoryCount = new Set(rows.map((r) => r.material.categoryId)).size;

      const projectPurchases = purchases.filter((p) => p.projectId === id && p.status !== "cancelled");
      purchaseCost = projectPurchases.reduce((sum, p) => sum + p.total.amount, 0);
      recentPurchases = [...projectPurchases]
        .sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""))
        .slice(0, 5)
        .map((p) => ({ purchase: p, material: p.materialId ? materialsById.get(p.materialId) : undefined, vendor: vendorsById.get(p.vendorId) }));

      recentUsage = [...projectMovements]
        .filter((m) => m.type === "used" || m.type === "wastage")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((m) => ({ movement: m, material: materialsById.get(m.materialId) }));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Materials couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !rows || !recentPurchases || !recentUsage) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-fg-muted">Materials, purchases, and stock for {project.name}.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Link
            href={`/admin/procurement/purchases?projectId=${project.id}`}
            className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Purchases <ArrowRight aria-hidden className="size-3.5" />
          </Link>
          <Link
            href={`/admin/procurement/stock?projectId=${project.id}`}
            className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Stock Ledger <ArrowRight aria-hidden className="size-3.5" />
          </Link>
          <Link
            href="/admin/procurement"
            className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
          >
            Suppliers <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No stock movements recorded yet"
          description="Your project material inventory will appear here."
          action={
            <Link href={`/admin/procurement/stock/new?projectId=${project.id}`} className="text-body-sm text-accent font-medium hover:underline">
              Add Material
            </Link>
          }
        />
      ) : (
        <>
          <DashboardSection title="Overview">
            <KpiCard label="Material Types" value={categoryCount ?? 0} />
            <KpiCard label="Stock Items Tracked" value={rows.length} />
            <KpiCard label="Total Purchase Cost" value={purchaseCost ?? 0} formatValue={formatBDT} />
            <KpiCard label="Low Stock" value={lowStockCount ?? 0} status={(lowStockCount ?? 0) > 0 ? "error" : "success"} />
          </DashboardSection>

          <section>
            <h2 className="text-label text-fg-subtle mb-3 uppercase">Stock</h2>
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-3 font-normal">Material</th>
                    <th className="px-4 py-3 text-right font-normal">Received</th>
                    <th className="px-4 py-3 text-right font-normal">Used</th>
                    <th className="px-4 py-3 text-right font-normal">Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ material, summary, threshold }) => {
                    const low = isLowStock(summary.currentStock, threshold);
                    return (
                      <tr key={material.id} className={`border-border text-body-sm border-b last:border-b-0 ${low ? "bg-error-soft/40" : ""}`}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/procurement/materials/${material.id}`} className="text-fg hover:text-accent transition-colors">
                            {material.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {summary.received} {material.unit}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {summary.used} {material.unit}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium tabular-nums ${low ? "text-error" : "text-fg"}`}>
                          {summary.currentStock} {material.unit}
                          {low && <span className="text-caption ml-2 font-normal">Low Stock</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h2 className="text-label text-fg-subtle mb-3 uppercase">Recent Purchases</h2>
              {recentPurchases.length === 0 ? (
                <EmptyState title="No purchases yet" description="Purchases recorded for this project will appear here." />
              ) : (
                <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                  {recentPurchases.map(({ purchase, material, vendor }) => (
                    <Link
                      key={purchase.id}
                      href={`/admin/procurement/purchases/${purchase.id}`}
                      className="border-border hover:bg-surface flex items-center justify-between gap-3 border-b p-3 transition-colors last:border-b-0"
                    >
                      <div>
                        <p className="text-body-sm text-fg font-medium">{material?.name ?? "Unknown material"}</p>
                        <p className="text-caption text-fg-subtle mt-0.5">
                          {vendor?.name ?? "Unknown supplier"} · {purchase.purchaseDate ? formatDate(new Date(purchase.purchaseDate)) : "—"}
                        </p>
                      </div>
                      <span className="text-body-sm text-fg tabular-nums">{formatBDT(purchase.total.amount)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-label text-fg-subtle mb-3 uppercase">Recent Usage</h2>
              {recentUsage.length === 0 ? (
                <EmptyState title="No usage recorded yet" description="Material consumption recorded on this project will appear here." />
              ) : (
                <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                  {recentUsage.map(({ movement, material }) => (
                    <div key={movement.id} className="border-border flex items-center justify-between gap-3 border-b p-3 last:border-b-0">
                      <div>
                        <p className="text-body-sm text-fg font-medium">{material?.name ?? "Unknown material"}</p>
                        <p className="text-caption text-fg-subtle mt-0.5">
                          {formatDate(new Date(movement.date))}
                          {movement.activity ? ` · ${movement.activity}` : ""}
                        </p>
                      </div>
                      <span className="text-body-sm text-fg-muted tabular-nums">
                        {movement.quantity} {material?.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
