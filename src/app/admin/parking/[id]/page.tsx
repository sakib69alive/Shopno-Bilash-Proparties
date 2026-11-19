import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { formatBDT, formatDate } from "@/lib/format";
import { parkingRepository } from "@/features/parking/repository";
import { projectRepository } from "@/features/projects/repository";
import { buildingRepository } from "@/features/buildings/repository";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { resolveDocumentOwner } from "@/features/documents/resolveOwner";
import { getOwnershipHistory } from "@/features/ownership/queries";
import { canAccessProject } from "@/lib/projectScope";
import { ParkingOwnerControl } from "@/components/admin/parking/ParkingOwnerControl";

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

export default async function AdminParkingDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "parking.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this parking space." />
      </div>
    );
  }

  let parking, project, building, ownerLabel, ownerHref, history;
  try {
    parking = await parkingRepository.findById(id);
    if (parking) {
      [project, building] = await Promise.all([
        projectRepository.findById(parking.projectId),
        parking.buildingId ? buildingRepository.findById(parking.buildingId) : Promise.resolve(null),
      ]);
      if (parking.ownerType && parking.ownerId) {
        const resolved = await resolveDocumentOwner(parking.ownerType, parking.ownerId);
        ownerLabel = resolved.label;
        ownerHref = resolved.href;
      }
      history = await getOwnershipHistory("parking", parking.id);
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This parking space couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!parking) notFound();
  if (!canAccessProject(user, parking.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This parking space belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "parking.manage");

  const [customers, allShareholders, allShareholdings, allLandowners, allAgreements] = await Promise.all([
    customerRepository.list(),
    shareholderRepository.list(),
    shareholdingRepository.list(),
    landownerRepository.list(),
    agreementRepository.list(),
  ]);
  const shareholdersById = new Map(allShareholders.map((s) => [s.id, s]));
  const shareholderOptions = [...new Set(allShareholdings.filter((s) => s.projectId === parking.projectId).map((s) => s.shareholderId))].map(
    (shareholderId) => ({ id: shareholderId, name: shareholdersById.get(shareholderId)?.name ?? "Unknown" }),
  );
  const landownersById = new Map(allLandowners.map((l) => [l.id, l]));
  const landownerOptions = [...new Set(allAgreements.filter((a) => a.projectId === parking.projectId).map((a) => a.landownerId))].map(
    (landownerId) => ({ id: landownerId, name: landownersById.get(landownerId)?.name ?? "Unknown" }),
  );

  return (
    <>
      <AdminPageHeader
        title={parking.parkingNumber}
        breadcrumbs={[{ label: "Parking", href: "/admin/parking" }, { label: parking.parkingNumber }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={parking.status} />
            {canManage && (
              <Link href={`/admin/parking/${parking.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Details"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Project" value={project?.name ?? "—"} />
            <Fact label="Building" value={building?.name ?? "Not tied to a building"} />
            <Fact label="Zone" value={parking.zone ?? "—"} />
            <Fact label="Type" value={parking.type ?? "—"} />
            <Fact label="Value" value={parking.value ? formatBDT(parking.value.amount) : "—"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-3 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Owner"}</AdminText></h2>
          {canManage ? (
            <ParkingOwnerControl
              parkingId={parking.id}
              ownerLabel={ownerLabel}
              ownerHref={ownerHref}
              customers={customers}
              shareholderOptions={shareholderOptions}
              landownerOptions={landownerOptions}
            />
          ) : ownerLabel ? (
            ownerHref ? (
              <Link href={ownerHref} className="text-body text-fg hover:text-accent font-medium transition-colors">
                {ownerLabel}
              </Link>
            ) : (
              <p className="text-body text-fg font-medium">{ownerLabel}</p>
            )
          ) : (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"No owner assigned — independent of any unit’s owner."}</AdminText></p>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Assignment History"}</AdminText></h2>
          {!history || history.length === 0 ? (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"No assignment changes recorded yet."}</AdminText></p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((row) => (
                <div key={row.id} className="border-border flex items-center justify-between border-b py-2 last:border-b-0">
                  <p className="text-body-sm text-fg-muted capitalize">{row.ownerType}</p>
                  <p className="text-caption text-fg-subtle">
                    {row.startDate.slice(0, 10)} — {row.endDate ? row.endDate.slice(0, 10) : "present"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(parking.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(parking.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
