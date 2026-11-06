import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CostAllocationForm } from "@/components/admin/finance/CostAllocationForm";
import { createCostAllocation } from "@/features/costAllocations/actions";
import { projectRepository } from "@/features/projects/repository";

export default async function NewCostAllocationPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a cost allocation." />
      </div>
    );
  }

  const projects = await projectRepository.list();

  return (
    <>
      <AdminPageHeader
        title="New budget"
        breadcrumbs={[{ label: "Cost Allocations", href: "/admin/finance/cost-allocations" }, { label: "New" }]}
      />
      <div className="p-4 sm:p-6">
        <CostAllocationForm action={createCostAllocation} projects={projects} submitLabel="Next: choose who pays" />
      </div>
    </>
  );
}
