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
import { DeleteLeadButton } from "@/components/admin/crm/DeleteLeadButton";
import { formatBDT, formatDate } from "@/lib/format";
import { leadRepository } from "@/features/crm/repository";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";
import { canAccessProjectOptional } from "@/lib/projectScope";

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
 * Read-only overview (Admin Step 11, matching the Step 5-10 pattern) —
 * create/edit/assign come in a later step. `LeadActivity` (call/message/
 * note history) is not shown here — deferred, no repository exists for
 * it yet.
 */
export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "lead.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this lead." />
      </div>
    );
  }

  let lead, interestedProject, interestedUnit, assignedSalesperson;
  try {
    lead = await leadRepository.findById(id);
    interestedProject = lead?.interestedProjectId ? await projectRepository.findById(lead.interestedProjectId) : null;
    interestedUnit = lead?.interestedUnitId ? await unitRepository.findById(lead.interestedUnitId) : null;
    assignedSalesperson = lead?.assignedSalespersonId
      ? await userRepository.findById(lead.assignedSalespersonId)
      : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This lead couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!lead) notFound();
  if (!canAccessProjectOptional(user, lead.interestedProjectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This lead belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "lead.manage");

  return (
    <>
      <AdminPageHeader
        title={lead.name}
        breadcrumbs={[{ label: "Leads / Enquiries", href: "/admin/leads" }, { label: lead.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            {canManage && (
              <>
                <Link href={`/admin/leads/${lead.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  <AdminText>{"Edit"}</AdminText>
                </Link>
                <DeleteLeadButton id={lead.id} name={lead.name} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Contact"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Phone" value={lead.phone} />
            <Fact label="Email" value={lead.email ?? "—"} />
            <Fact label="Source" value={lead.source} />
            <Fact label="Next Follow-up" value={lead.nextFollowUpAt ? formatDate(new Date(lead.nextFollowUpAt)) : "—"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Interest"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Budget" value={lead.budget ? formatBDT(lead.budget.amount) : "—"} />
            <Fact label="Assigned To" value={assignedSalesperson?.name ?? "—"} />
          </div>
          {interestedProject && (
            <Link
              href={`/admin/projects/${interestedProject.id}`}
              className="text-body-sm text-accent hover:text-accent-strong transition-colors"
            >
              <AdminText>{"Interested in"}</AdminText> {interestedProject.name} →
            </Link>
          )}
          {interestedUnit && (
            <Link
              href={`/admin/properties/${interestedUnit.id}`}
              className="text-body-sm text-accent hover:text-accent-strong transition-colors"
            >
              <AdminText>{"Interested in unit"}</AdminText> {interestedUnit.unitNumber} →
            </Link>
          )}
          {!interestedProject && !interestedUnit && <p className="text-body-sm text-fg-subtle"><AdminText>{"No specific project or unit noted."}</AdminText></p>}
        </section>

        {lead.notes && (
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Notes"}</AdminText></h2>
            <p className="text-body text-fg-muted whitespace-pre-line">{lead.notes}</p>
          </section>
        )}

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(lead.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(lead.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
