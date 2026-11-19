import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { CostAllocationExplorer } from "@/components/admin/finance/CostAllocationExplorer";
import { costAllocationRepository } from "@/features/costAllocations/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

/**
 * Unit-based cost-allocation list — each row splits a shared construction
 * cost across every unit owner in a project by unit size (`sizeSqft`),
 * instead of the flat `Shareholding.sharePercentage` model. See
 * `src/types/finance/costAllocation.ts`.
 */
export default async function AdminCostAllocationsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Cost Allocations." />
      </div>
    );
  }

  let allocations, projects;
  try {
    const [allAllocations, allProjects] = await Promise.all([costAllocationRepository.list(), projectRepository.list()]);
    allocations = filterToVisibleProjects(user, allAllocations);
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Cost Allocations couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Cost Allocations"}</AdminText>}
        description={<AdminText>{"Split a shared construction cost across every unit owner, by unit size."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/finance/cost-allocations/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Allocation"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <CostAllocationExplorer allocations={allocations} projects={projects} canCreate={canManage} />
      </div>
    </>
  );
}
