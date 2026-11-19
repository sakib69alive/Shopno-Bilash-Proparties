import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadForm } from "@/components/admin/crm/LeadForm";
import { updateLead } from "@/features/crm/actions";
import { leadRepository } from "@/features/crm/repository";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "lead.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this lead." />
      </div>
    );
  }

  const [lead, projects, units, users] = await Promise.all([
    leadRepository.findById(id),
    projectRepository.list(),
    unitRepository.list(),
    userRepository.list(),
  ]);
  if (!lead) notFound();

  const boundAction = updateLead.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={lead.name}
        breadcrumbs={[
          { label: "Leads / Enquiries", href: "/admin/leads" },
          { label: lead.name, href: `/admin/leads/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <LeadForm action={boundAction} lead={lead} projects={projects} units={units} users={users} submitLabel="Save Changes" />
      </div>
    </>
  );
}
