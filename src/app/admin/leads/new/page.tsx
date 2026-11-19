import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LeadForm } from "@/components/admin/crm/LeadForm";
import { createLead } from "@/features/crm/actions";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { userRepository } from "@/features/users/repository";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "lead.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a lead." />
      </div>
    );
  }

  const [projects, units, users] = await Promise.all([
    projectRepository.list(),
    unitRepository.list(),
    userRepository.list(),
  ]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Lead"}</AdminText>} breadcrumbs={[{ label: "Leads / Enquiries", href: "/admin/leads" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <LeadForm action={createLead} projects={projects} units={units} users={users} submitLabel="Add Lead" />
      </div>
    </>
  );
}
