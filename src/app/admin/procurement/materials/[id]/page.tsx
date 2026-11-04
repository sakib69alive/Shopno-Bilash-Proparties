import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DashboardSection } from "@/components/admin/dashboard/DashboardSection";
import { KpiCard } from "@/components/admin/dashboard/KpiCard";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { SetLifecycleStatusButton } from "@/components/admin/procurement/SetLifecycleStatusButton";
import { formatBDT, formatDate, formatNumber } from "@/lib/format";
import { summarizeStock, summarizeMaterialCost, buildLedger } from "@/lib/materialStock";
import { setMaterialStatus } from "@/features/procurement/materialActions";
import {
  materialRepository,
  materialCategoryRepository,
  purchaseRepository,
  stockMovementRepository,
  vendorRepository,
} from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

/**
 * A material is global master data, but every number here that matters
 * (stock, cost, ledger) is computed per project and shown per project —
 * "Project 1 Cement ≠ Project 2 Cement stock" isn't just enforced at write
 * time, it's never even summed together here except in an explicitly
 * labeled "across all projects" total.
 */
export default async function MaterialDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this material." />
      </div>
    );
  }

  let material, category, purchases, movements, vendorsById, projects, allProjectsVisible;
  try {
    material = await materialRepository.findById(id);
    if (!material) notFound();
    category = await materialCategoryRepository.findById(material.categoryId);

    const [allPurchases, allMovements, allVendors, allProjects] = await Promise.all([
      purchaseRepository.list(),
      stockMovementRepository.list(),
      vendorRepository.list(),
      projectRepository.list(),
    ]);
    purchases = filterToVisibleProjects(user, allPurchases.filter((p) => p.materialId === id));
    movements = filterToVisibleProjects(user, allMovements.filter((m) => m.materialId === id));
    vendorsById = new Map(allVendors.map((v) => [v.id, v]));
    allProjectsVisible = filterVisibleProjectsList(user, allProjects);
    const projectIdsWithActivity = new Set([...purchases.map((p) => p.projectId), ...movements.map((m) => m.projectId)]);
    projects = allProjectsVisible.filter((p) => projectIdsWithActivity.has(p.id));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This material couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!material) notFound();

  const canManage = hasPermission(user.role, "procurement.manage");
  const nonCancelledPurchases = purchases.filter((p) => p.status !== "cancelled");
  const costSummary = summarizeMaterialCost(nonCancelledPurchases);
  const overallStock = summarizeStock(movements);
  const suppliers = [...new Map(purchases.map((p) => [p.vendorId, vendorsById.get(p.vendorId)])).values()].filter((v) => !!v);
  const priceHistory = [...nonCancelledPurchases].sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
  const usageHistory = [...movements].filter((m) => m.type === "used" || m.type === "wastage").sort((a, b) => b.date.localeCompare(a.date));
  const ledger = buildLedger(movements).reverse();
  const projectsById = new Map(allProjectsVisible.map((p) => [p.id, p]));

  return (
    <>
      <AdminPageHeader
        title={material.name}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Materials", href: "/admin/procurement/materials" },
          { label: material.name },
        ]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={material.status === "inactive" ? "inactive" : "active"} />
            {canManage && (
              <>
                <SetLifecycleStatusButton status={material.status} label={material.name} onSetStatus={setMaterialStatus.bind(null, material.id)} />
                <Link href={`/admin/procurement/materials/${material.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  Edit
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <section className="border-border bg-surface-raised grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
          <Fact label="Category" value={category?.name ?? "—"} />
          <Fact label="Brand" value={material.brand ?? "—"} />
          <Fact label="Specification" value={material.specification ?? "—"} />
          <Fact label="Grade" value={material.grade ?? "—"} />
          <Fact label="Unit" value={material.unit} />
          <Fact label="Reference Price" value={material.defaultPrice ? formatBDT(material.defaultPrice.amount) : "—"} />
        </section>
        {material.description && <p className="text-body-sm text-fg-muted">{material.description}</p>}

        <DashboardSection title="Overview (across all visible projects)">
          <KpiCard label="Current Stock" value={overallStock.currentStock} formatValue={(v) => `${formatNumber(v)} ${material.unit}`} />
          <KpiCard label="Total Purchased" value={costSummary.totalQuantityPurchased} formatValue={(v) => `${formatNumber(v)} ${material.unit}`} />
          <KpiCard label="Total Purchase Cost" value={costSummary.totalPurchaseCost} formatValue={formatBDT} />
          <KpiCard label="Average Price" value={costSummary.averagePurchasePrice} formatValue={formatBDT} />
          <KpiCard
            label="Latest Price"
            value={costSummary.latestPurchasePrice ?? 0}
            formatValue={(v) => (costSummary.latestPurchasePrice !== undefined ? formatBDT(v) : "—")}
          />
        </DashboardSection>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Project Breakdown</h2>
          {projects.length === 0 ? (
            <EmptyState title="No activity yet" description="No purchases or stock movements recorded for this material in any visible project." />
          ) : (
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-2.5 font-normal">Project</th>
                    <th className="px-4 py-2.5 text-right font-normal">Current Stock</th>
                    <th className="px-4 py-2.5 text-right font-normal">Purchased</th>
                    <th className="px-4 py-2.5 text-right font-normal">Used</th>
                    <th className="px-4 py-2.5 text-right font-normal">Purchase Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const projectStock = summarizeStock(movements.filter((m) => m.projectId === project.id));
                    const projectCost = summarizeMaterialCost(nonCancelledPurchases.filter((p) => p.projectId === project.id));
                    return (
                      <tr key={project.id} className="border-border text-body-sm border-b last:border-b-0">
                        <td className="px-4 py-2.5">
                          <Link href={`/admin/projects/${project.id}/materials`} className="text-fg hover:text-accent transition-colors">
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                          {formatNumber(projectStock.currentStock)} {material.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatNumber(projectCost.totalQuantityPurchased)} {material.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatNumber(projectStock.used)} {material.unit}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatBDT(projectCost.totalPurchaseCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Suppliers</h2>
          {suppliers.length === 0 ? (
            <EmptyState title="No suppliers yet" description="Suppliers this material has been purchased from will appear here." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {suppliers.map((v) => (
                <Link
                  key={v!.id}
                  href={`/admin/procurement/${v!.id}`}
                  className="border-border bg-surface-raised text-body-sm text-fg hover:border-accent rounded-full border px-3 py-1.5 transition-colors"
                >
                  {v!.name}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Purchase &amp; Price History</h2>
          {priceHistory.length === 0 ? (
            <EmptyState title="No purchases yet" description="Every purchase of this material preserves the price actually paid at the time." />
          ) : (
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-2.5 font-normal">Date</th>
                    <th className="px-4 py-2.5 font-normal">Project</th>
                    <th className="px-4 py-2.5 font-normal">Supplier</th>
                    <th className="px-4 py-2.5 text-right font-normal">Quantity</th>
                    <th className="px-4 py-2.5 text-right font-normal">Unit Price</th>
                    <th className="px-4 py-2.5 text-right font-normal">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((p) => (
                    <tr key={p.id} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{p.purchaseDate ? formatDate(new Date(p.purchaseDate)) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/projects/${p.projectId}`} className="hover:text-accent transition-colors">
                          {projectsById.get(p.projectId)?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/procurement/${p.vendorId}`} className="hover:text-accent transition-colors">
                          {vendorsById.get(p.vendorId)?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {p.quantity !== undefined ? `${p.quantity.toLocaleString()} ${p.unit}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{p.unitPrice ? formatBDT(p.unitPrice.amount) : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatBDT(p.total.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Usage History</h2>
          {usageHistory.length === 0 ? (
            <EmptyState title="No usage recorded yet" description="Material consumption recorded on a project's Stock page will appear here." />
          ) : (
            <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
              {usageHistory.map((m) => (
                <div key={m.id} className="border-border flex items-center justify-between gap-3 border-b p-4 last:border-b-0">
                  <div>
                    <p className="text-body-sm text-fg">
                      {m.type === "wastage" ? "Wastage" : "Used"} — {formatNumber(m.quantity)} {material.unit}
                    </p>
                    <p className="text-caption text-fg-subtle mt-0.5">
                      {projectsById.get(m.projectId)?.name ?? "Unknown project"} · {formatDate(new Date(m.date))}
                      {m.activity ? ` · ${m.activity}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Stock Ledger</h2>
          {ledger.length === 0 ? (
            <EmptyState title="No movements yet" description="Every stock movement across every visible project will appear here." />
          ) : (
            <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-2.5 font-normal">Date</th>
                    <th className="px-4 py-2.5 font-normal">Project</th>
                    <th className="px-4 py-2.5 font-normal">Type</th>
                    <th className="px-4 py-2.5 text-right font-normal">Movement</th>
                    <th className="px-4 py-2.5 text-right font-normal">After</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map(({ movement: m, after }) => (
                    <tr key={m.id} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{formatDate(new Date(m.date))}</td>
                      <td className="px-4 py-2.5">{projectsById.get(m.projectId)?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">{m.type}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(m.quantity)}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatNumber(after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
