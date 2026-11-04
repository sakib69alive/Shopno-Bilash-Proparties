import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteStockMovementButton } from "@/components/admin/procurement/DeleteStockMovementButton";
import { formatDate, formatNumber } from "@/lib/format";
import { summarizeStock, buildLedger } from "@/lib/materialStock";
import { stockMovementRepository, materialRepository } from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { unitRepository } from "@/features/units/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string; materialId?: string }>;
}

const TYPE_LABEL: Record<string, string> = {
  opening: "Opening Stock",
  received: "Received",
  used: "Used",
  wastage: "Wastage",
  adjustment: "Adjustment",
};

export default async function StockLedgerPage({ searchParams }: PageProps) {
  const { projectId, materialId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this ledger." />
      </div>
    );
  }

  if (!projectId || !materialId) notFound();

  const [project, material, allMovements, buildings, floors, units, phases] = await Promise.all([
    projectRepository.findById(projectId),
    materialRepository.findById(materialId),
    stockMovementRepository.list(),
    buildingRepository.list(),
    floorRepository.list(),
    unitRepository.list(),
    constructionPhaseRepository.list(),
  ]);
  if (!project || !material) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const movements = allMovements.filter((m) => m.projectId === projectId && m.materialId === materialId);
  const summary = summarizeStock(movements);
  const ledger = buildLedger(movements).reverse(); // most recent first, same order the old list used
  const buildingsById = new Map(buildings.map((b) => [b.id, b]));
  const floorsById = new Map(floors.map((f) => [f.id, f]));
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const phasesById = new Map(phases.map((p) => [p.id, p]));
  const canManage = hasPermission(user.role, "procurement.manage");

  return (
    <>
      <AdminPageHeader
        title={`${material.name} — ${project.name}`}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Stock", href: `/admin/procurement/stock?projectId=${projectId}` },
          { label: material.name },
        ]}
        primaryAction={
          canManage && (
            <Link href={`/admin/procurement/stock/new?projectId=${projectId}`} className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              Record Movement
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["opening", "received", "used", "wastage"] as const).map((key) => (
            <div key={key} className="border-border bg-surface-raised rounded-lg border p-3">
              <p className="text-caption text-fg-subtle uppercase">{TYPE_LABEL[key]}</p>
              <p className="text-body-sm text-fg mt-1 tabular-nums">
                {formatNumber(summary[key])} {material.unit}
              </p>
            </div>
          ))}
          <div className="border-border bg-accent-soft rounded-lg border p-3">
            <p className="text-caption text-fg-subtle uppercase">Current Stock</p>
            <p className="text-body-sm text-fg mt-1 font-semibold tabular-nums">
              {formatNumber(summary.currentStock)} {material.unit}
            </p>
          </div>
        </div>

        {ledger.length === 0 ? (
          <EmptyState title="No movements recorded yet" description="Record the first opening stock or delivery for this material." />
        ) : (
          <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border text-label text-fg-subtle border-b uppercase">
                  <th className="px-4 py-2.5 font-normal">Date</th>
                  <th className="px-4 py-2.5 font-normal">Type</th>
                  <th className="px-4 py-2.5 text-right font-normal">Before</th>
                  <th className="px-4 py-2.5 text-right font-normal">Movement</th>
                  <th className="px-4 py-2.5 text-right font-normal">After</th>
                  <th className="px-4 py-2.5 font-normal">Context / Reference</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {ledger.map(({ movement: m, before, after }) => {
                  const contextParts = [
                    m.buildingId ? buildingsById.get(m.buildingId)?.name : undefined,
                    m.floorId ? floorsById.get(m.floorId)?.label : undefined,
                    m.unitId ? `Unit ${unitsById.get(m.unitId)?.unitNumber}` : undefined,
                    m.constructionPhaseId ? phasesById.get(m.constructionPhaseId)?.name : undefined,
                    m.activity,
                    m.contractorTeam,
                  ].filter((v): v is string => !!v);
                  return (
                    <tr key={m.id} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-2.5 text-fg-muted whitespace-nowrap">{formatDate(new Date(m.date))}</td>
                      <td className="px-4 py-2.5">{TYPE_LABEL[m.type]}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(before)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${after - before < 0 ? "text-error" : "text-success"}`}>
                        {after - before >= 0 ? "+" : ""}
                        {formatNumber(after - before)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatNumber(after)}</td>
                      <td className="px-4 py-2.5 text-fg-muted">
                        {[...contextParts, m.reference, m.notes].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">{canManage && <DeleteStockMovementButton id={m.id} />}</td>
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
