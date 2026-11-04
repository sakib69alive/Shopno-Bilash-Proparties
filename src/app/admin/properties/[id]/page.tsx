import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, FileText, Landmark } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { Media } from "@/components/ui/Media";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteUnitButton } from "@/components/admin/properties/DeleteUnitButton";
import { UnitDetailTabs } from "@/components/admin/properties/UnitDetailTabs";
import { UnitOwnershipPanel, type CurrentOwnerInfo, type HistoryRow } from "@/components/admin/properties/UnitOwnershipPanel";
import { UnitParkingPanel } from "@/components/admin/properties/UnitParkingPanel";
import { formatBDT, formatDate } from "@/lib/format";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { floorRepository } from "@/features/floors/repository";
import { saleRepository, bookingRepository } from "@/features/sales/repository";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { parkingRepository } from "@/features/parking/repository";
import { documentRepository } from "@/features/documents/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { resolveUnitOwner } from "@/features/ownership/resolveUnitOwner";
import { getOwnershipHistory } from "@/features/ownership/queries";
import { ownershipTransferRepository } from "@/features/ownership/repository";
import { resolveUnitPlan } from "@/lib/unitPlan";
import { customerRepository } from "@/features/customers/repository";
import type { PendingTransferRow } from "@/components/admin/properties/UnitOwnershipPanel";
import { canAccessProject } from "@/lib/projectScope";
import {
  costAllocationRepository,
  ownerContributionRepository,
  unitAllocationRepository,
  contributionAdjustmentRepository,
} from "@/features/costAllocations/repository";
import { computeContributionState } from "@/lib/contributionStatus";

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

export default async function AdminPropertyDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "unit.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this property." />
      </div>
    );
  }

  let unit, project, building, floor;
  try {
    unit = await unitRepository.findById(id);
    if (unit) {
      [project, building, floor] = await Promise.all([
        projectRepository.findById(unit.projectId),
        buildingRepository.findById(unit.buildingId),
        floorRepository.findById(unit.floorId),
      ]);
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This property couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!unit) notFound();
  if (!canAccessProject(user, unit.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This property belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "unit.manage");

  // ---- Ownership tab data ----
  const ownerRef = await resolveUnitOwner(unit);
  let currentOwner: CurrentOwnerInfo | undefined;
  if (ownerRef) {
    const resolved = await resolveDocumentOwner(ownerRef.ownerType, ownerRef.ownerId);
    currentOwner = { ownerType: ownerRef.ownerType, label: resolved.label, href: resolved.href };
    if (ownerRef.ownerType === "customer") {
      const sales = await saleRepository.list();
      const sale = sales.find((s) => s.unitId === unit.id);
      currentOwner.saleHref = sale ? `/admin/sales/${sale.id}` : undefined;
    } else if (ownerRef.ownerType === "shareholder" && unit.shareholderId) {
      const shareholdings = await shareholdingRepository.list();
      const holding = shareholdings.find((s) => s.shareholderId === unit.shareholderId && s.allocatedUnitIds.includes(unit.id));
      currentOwner.shareholderId = unit.shareholderId;
      currentOwner.shareholdingId = holding?.id;
    } else if (ownerRef.ownerType === "landowner") {
      currentOwner.landownerId = ownerRef.ownerId;
    }
  }

  const historyRaw = await getOwnershipHistory("unit", unit.id);
  const history: HistoryRow[] = await Promise.all(
    historyRaw.map(async (row) => {
      const resolved = await resolveDocumentOwner(row.ownerType, row.ownerId);
      return {
        id: row.id,
        ownerLabel: resolved.label,
        ownerHref: resolved.href,
        source: row.source,
        startDate: row.startDate,
        endDate: row.endDate,
      };
    }),
  );

  const [allShareholders, allShareholdings, allLandowners, allAgreements, allCustomers, allTransfers] = await Promise.all([
    shareholderRepository.list(),
    shareholdingRepository.list(),
    landownerRepository.list(),
    agreementRepository.list(),
    customerRepository.list(),
    ownershipTransferRepository.list(),
  ]);
  const customersById = new Map(allCustomers.map((c) => [c.id, c]));
  const customerOptions = allCustomers
    .filter((c) => !(ownerRef?.ownerType === "customer" && ownerRef.ownerId === c.id))
    .map((c) => ({ value: c.id, label: c.name }));
  const pendingTransfers: PendingTransferRow[] = allTransfers
    .filter((t) => t.unitId === unit.id && t.status === "pending")
    .map((t) => ({
      id: t.id,
      newOwnerLabel: customersById.get(t.newOwnerId)?.name ?? "Unknown customer",
      date: t.date,
      reason: t.reason,
      obligationHandling: t.obligationHandling,
      status: t.status,
    }));
  const shareholdersById = new Map(allShareholders.map((s) => [s.id, s]));
  const shareholderOptions = allShareholdings
    .filter((s) => s.projectId === unit.projectId)
    .map((s) => ({ shareholderId: s.shareholderId, shareholdingId: s.id, name: shareholdersById.get(s.shareholderId)?.name ?? "Unknown" }));
  const landownersById = new Map(allLandowners.map((l) => [l.id, l]));
  const landownerOptions = allAgreements
    .filter((a) => a.projectId === unit.projectId)
    .map((a) => ({ landownerId: a.landownerId, agreementId: a.id, name: landownersById.get(a.landownerId)?.name ?? "Unknown" }));

  // ---- Parking tab data ----
  let unitParkingSpaces: Awaited<ReturnType<typeof parkingRepository.list>> = [];
  if (ownerRef) {
    const allParking = await parkingRepository.list();
    unitParkingSpaces = allParking.filter((p) => p.ownerType === ownerRef.ownerType && p.ownerId === ownerRef.ownerId);
  }

  // ---- Documents tab data ----
  const allDocuments = await documentRepository.list();
  const unitDocuments = allDocuments.filter((d) => d.ownerType === "unit" && d.ownerId === unit.id);

  // ---- Financial tab data ----
  const [allUnitAllocations, allAllocations, allContributions, allAdjustments] = await Promise.all([
    unitAllocationRepository.list(),
    costAllocationRepository.list(),
    ownerContributionRepository.list(),
    contributionAdjustmentRepository.list(),
  ]);
  const unitAllocations = allUnitAllocations.filter((ua) => ua.unitId === unit.id);
  const financialRows = unitAllocations
    .map((ua) => {
      const allocation = allAllocations.find((a) => a.id === ua.costAllocationId);
      const contribution = allContributions.find((c) => c.id === ua.contributionId);
      if (!allocation || !contribution) return null;
      const ownAdjustments = allAdjustments.filter((adj) => adj.contributionId === contribution.id);
      const state = computeContributionState(contribution, allocation, ownAdjustments);
      return {
        id: ua.id,
        goalTitle: allocation.title,
        allocationId: allocation.id,
        unitPayable: ua.payableAmount.amount,
        unitRatio: ua.ratio,
        ownerTotal: contribution.payableAmount.amount,
        ownerStatus: state.status,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const overviewContent = (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col gap-4">
        <div className="border-border bg-surface-raised grid grid-cols-2 gap-4 rounded-lg border p-4">
          <Fact label="Project" value={project ? project.name : "—"} />
          <Fact label="Type" value={project?.propertyType ?? "—"} />
          <Fact label="Building" value={building?.name ?? "—"} />
          <Fact label="Floor" value={floor?.label ?? "—"} />
          <Fact label="Area" value={`${unit.sizeSqft.toLocaleString()} sqft`} />
          <Fact label="Facing" value={unit.facing ?? "—"} />
          <Fact label="Bedrooms" value={String(unit.bedrooms)} />
          <Fact label="Bathrooms" value={String(unit.bathrooms)} />
          <Fact label="Balconies" value={String(unit.balconies)} />
          <Fact label="Parking Spaces" value={String(unit.parkingSpaces)} />
        </div>
        {project && (
          <Link href={`/admin/projects/${project.id}`} className="text-body-sm text-accent hover:text-accent-strong transition-colors">
            View parent project →
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Pricing</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Base Price" value={formatBDT(unit.basePrice.amount)} />
            <Fact label="Additional Charges" value={formatBDT(unit.additionalCharges.amount)} />
            <Fact label="Discount" value={formatBDT(unit.discount.amount)} />
            <Fact label="Final Price" value={formatBDT(unit.finalPrice.amount)} />
          </div>
        </section>
        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(unit.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(unit.updatedAt))} />
          </div>
        </section>
      </div>
    </div>
  );

  const plan = resolveUnitPlan(unit, project, floor?.floorNumber);
  const designContent = (
    <div className="flex flex-col gap-4">
      {plan.source !== "none" && (
        <p className="text-body-sm text-fg-muted">
          {plan.source === "custom" ? "Custom blueprint for this flat." : `Blueprint type: ${plan.type?.name}${plan.source === "auto-type" ? " (matched automatically by flat code)" : ""}.`}
        </p>
      )}
      {plan.src ? (
        <Media src={plan.src} alt={`${unit.unitNumber} floor plan`} ratio="standard" radius="lg" sizes="(min-width: 1024px) 50vw, 100vw" />
      ) : (
        <div className="border-border bg-surface text-fg-subtle flex aspect-[4/3] max-w-md items-center justify-center rounded-lg border border-dashed">
          <p className="text-body-sm">No floor plan yet</p>
        </div>
      )}
      {unit.galleryImages && unit.galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {unit.galleryImages.map((src) => (
            <Media key={src} src={src} alt={`${unit.unitNumber} gallery`} ratio="square" radius="md" sizes="200px" />
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-fg-subtle">This unit&rsquo;s own gallery (its design may differ from other units) hasn&rsquo;t been added yet.</p>
      )}
    </div>
  );

  const documentsContent =
    unitDocuments.length === 0 ? (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Agreements, receipts, and specification sheets for this unit will appear here."
        action={
          <Link href={`/admin/documents/new?ownerType=unit&ownerId=${unit.id}`} className="text-body-sm text-accent font-medium hover:underline">
            Add Document
          </Link>
        }
      />
    ) : (
      <div className="flex flex-col gap-2">
        {unitDocuments.map((d) => (
          <Link
            key={d.id}
            href={`/admin/documents/${d.id}`}
            className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-fg-subtle"
          >
            <div>
              <p className="text-body-sm text-fg font-medium">{d.name}</p>
              <p className="text-caption text-fg-subtle">{d.category}</p>
            </div>
            <StatusBadge status={d.status} />
          </Link>
        ))}
      </div>
    );

  // ---- Sales & Bookings tab data ----
  const [allSalesForUnit, allBookingsForUnit] = await Promise.all([saleRepository.list(), bookingRepository.list()]);
  const unitSales = allSalesForUnit.filter((s) => s.unitId === unit.id).sort((a, b) => b.saleDate.localeCompare(a.saleDate));
  const unitBookings = allBookingsForUnit.filter((b) => b.unitId === unit.id).sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));

  const salesContent = (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-label text-fg-subtle mb-2 uppercase">Sale History</h2>
        {unitSales.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">No sales recorded for this unit yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unitSales.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sales/${s.id}`}
                className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-fg-subtle"
              >
                <div>
                  <p className="text-body-sm text-fg font-medium">{formatBDT(s.salePrice.amount)}</p>
                  <p className="text-caption text-fg-subtle">{formatDate(new Date(s.saleDate))}</p>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-label text-fg-subtle mb-2 uppercase">Booking History</h2>
        {unitBookings.length === 0 ? (
          <p className="text-body-sm text-fg-subtle">No bookings recorded for this unit yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unitBookings.map((b) => (
              <Link
                key={b.id}
                href="/admin/sales/bookings"
                className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-fg-subtle"
              >
                <div>
                  <p className="text-body-sm text-fg font-medium">{formatBDT(b.agreedPrice.amount)}</p>
                  <p className="text-caption text-fg-subtle">
                    {formatDate(new Date(b.bookingDate))}
                    {b.cancelledReason ? ` — ${b.cancelledReason}` : ""}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const financialContent =
    financialRows.length === 0 ? (
      <EmptyState
        icon={Landmark}
        title="Financial data will appear here once allocation/payment management is configured"
        description="This unit's construction contribution, installments, and payment history connect to Cost Allocations once generated for its project."
      />
    ) : (
      <div className="flex flex-col gap-2">
        {financialRows.map((row) => (
          <Link
            key={row.id}
            href={`/admin/finance/cost-allocations/${row.allocationId}`}
            className="border-border bg-surface-raised flex items-center justify-between rounded-lg border p-4 transition-colors hover:border-fg-subtle"
          >
            <div>
              <p className="text-body-sm text-fg font-medium">{row.goalTitle}</p>
              <p className="text-caption text-fg-subtle">
                This unit&rsquo;s share: {formatBDT(row.unitPayable)} ({(row.unitRatio * 100).toFixed(1)}% of owner&rsquo;s{" "}
                {formatBDT(row.ownerTotal)} total)
              </p>
            </div>
            <StatusBadge status={row.ownerStatus} />
          </Link>
        ))}
      </div>
    );

  return (
    <>
      <AdminPageHeader
        title={unit.unitNumber}
        breadcrumbs={[{ label: "Properties", href: "/admin/properties" }, { label: unit.unitNumber }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={unit.status} />
            {canManage && (
              <>
                <Link href={`/admin/properties/${unit.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  Edit
                </Link>
                <DeleteUnitButton id={unit.id} unitNumber={unit.unitNumber} />
              </>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6">
        <UnitDetailTabs
          overview={overviewContent}
          design={designContent}
          ownership={
            <UnitOwnershipPanel
              unitId={unit.id}
              currentOwner={currentOwner}
              history={history}
              shareholderOptions={shareholderOptions}
              landownerOptions={landownerOptions}
              customerOptions={customerOptions}
              pendingTransfers={pendingTransfers}
              canManage={canManage}
            />
          }
          sales={salesContent}
          parking={<UnitParkingPanel parkingSpaces={unitParkingSpaces} />}
          documents={documentsContent}
          financial={financialContent}
        />
      </div>
    </>
  );
}
