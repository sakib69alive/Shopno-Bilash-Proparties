import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OwnerDocumentsView } from "@/components/portal/OwnerDocumentsPage";
import { recordAuditEvent } from "@/features/audit/repository";
import { canInspectClientPortals } from "@/features/ownerPortal/inspectionAccess";
import {
  getOwnerConstructionProgress, getOwnerDocuments, getOwnerNextInstallment,
  getOwnerNotifications, getOwnerOutstanding, getOwnerProjects, getOwnerSaleSummaries, getOwnerUnits,
} from "@/features/ownerPortal/queries";
import { userRepository } from "@/features/users/repository";
import { getCurrentUser } from "@/lib/auth";
import { formatBDT, formatDate } from "@/lib/format";
import { resolveOwnerContext } from "@/lib/ownerContext";

export default async function InspectClientPortal({ params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !canInspectClientPortals(actor)) notFound();

  const { id } = await params;
  const client = await userRepository.findById(id);
  const owner = client && resolveOwnerContext(client);
  if (!client || !owner) notFound();

  const { ownerType, ownerId } = owner;
  const [units, projects, outstanding, next, progress, documents, notifications, sales] = await Promise.all([
    getOwnerUnits(ownerType, ownerId),
    getOwnerProjects(ownerType, ownerId),
    getOwnerOutstanding(ownerType, ownerId),
    getOwnerNextInstallment(ownerType, ownerId),
    getOwnerConstructionProgress(ownerType, ownerId),
    getOwnerDocuments(ownerType, ownerId),
    getOwnerNotifications(ownerType, ownerId),
    getOwnerSaleSummaries(ownerType, ownerId),
  ]);

  // The only write made here identifies the actual staff actor. No client
  // session, client mutation actions or last-seen tracking run in this view.
  await recordAuditEvent({
    actorUserId: actor.id,
    action: "clientPortal.inspect",
    entityType: "User",
    entityId: client.id,
  });

  const projectsById = new Map(projects.map((project) => [project.id, project.name]));
  const visibleSales = new Map(sales.filter((sale) => sale.visible).map((sale) => [sale.unitId, sale]));
  const unread = notifications.filter((notification) => (notification.status ?? (notification.readAt ? "read" : "unread")) === "unread").length;

  return (
    <>
      <AdminPageHeader title={`${client.name}'s portal`}
        breadcrumbs={[{ label: "Installations", href: "/admin/client-page/installations" }, { label: "Inspect portal", localize: true }]}
        description={<AdminText>{"Read-only inspection. Opening this view or a document leaves the client's activity and read status unchanged."}</AdminText>} />
      <section aria-label="Client dashboard" className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <div className="bg-surface-raised border-border rounded-xl border p-4">
          <h2 className="text-h4"><AdminText>{"Properties"}</AdminText></h2>
          {!units.length && <p className="text-fg-muted mt-2 text-sm"><AdminText>{"No linked flats."}</AdminText></p>}
          <ul className="mt-2 space-y-2 text-sm">
            {units.map((unit) => {
              const sale = visibleSales.get(unit.id);
              return (
                <li key={unit.id}>
                  <p>{projectsById.get(unit.projectId) ?? "Property"} · Flat {unit.unitNumber}</p>
                  {sale && <p className="text-fg-muted">{formatBDT(sale.paid)} paid · {formatBDT(Math.max(0, sale.price - sale.paid))}<AdminText>{" remaining"}</AdminText></p>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="bg-surface-raised border-border rounded-xl border p-4">
          <h2 className="text-h4"><AdminText>{"Project contributions"}</AdminText></h2>
          {outstanding.totalPayable > 0 ? (
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt><AdminText>{"Total payable"}</AdminText></dt><dd>{formatBDT(outstanding.totalPayable)}</dd></div>
              <div className="flex justify-between gap-2"><dt><AdminText>{"Paid"}</AdminText></dt><dd>{formatBDT(outstanding.totalPaid)}</dd></div>
              <div className="flex justify-between gap-2"><dt><AdminText>{"Outstanding"}</AdminText></dt><dd>{formatBDT(outstanding.totalOutstanding)}</dd></div>
              {next && <div className="flex justify-between gap-2"><dt><AdminText>{"Next installment"}</AdminText></dt><dd>{formatBDT(next.amount)} · {formatDate(new Date(next.dueDate))}</dd></div>}
            </dl>
          ) : <p className="text-fg-muted mt-2 text-sm"><AdminText>{"No contribution plan is shown."}</AdminText></p>}
        </div>
        <div className="bg-surface-raised border-border rounded-xl border p-4">
          <h2 className="text-h4"><AdminText>{"Construction"}</AdminText></h2>
          {!progress.length && <p className="text-fg-muted mt-2 text-sm"><AdminText>{"No updates shown."}</AdminText></p>}
          <ul className="mt-2 space-y-2 text-sm">
            {progress.map((project) => <li key={project.projectId}>
              {project.projectName} · {project.averageProgress === null ? "No progress recorded" : `${project.averageProgress}% complete`}
            </li>)}
          </ul>
        </div>
        <div className="bg-surface-raised border-border rounded-xl border p-4">
          <h2 className="text-h4"><AdminText>{"Notifications"}</AdminText></h2>
          <p className="text-fg-muted mt-2 text-sm">{unread} unread</p>
        </div>
      </section>
      <OwnerDocumentsView documents={documents} />
    </>
  );
}
