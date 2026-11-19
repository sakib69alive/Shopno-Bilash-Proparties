import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { PurchasesAdminExplorer } from "@/components/admin/procurement/PurchasesAdminExplorer";
import { purchaseRepository, purchaseReceiptRepository, vendorRepository, materialRepository } from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Procurement Foundation — Purchases. Reads `purchaseRepository` joined
 * against `vendorRepository`/`projectRepository`, gated on
 * `procurement.view`/`procurement.manage`. Full create/edit/delete.
 */
export default async function AdminPurchasesPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Purchases." />
      </div>
    );
  }

  let purchases, vendors, projects, materials, receivedByPurchaseId;
  try {
    const [allPurchases, allVendors, allProjects, allMaterials, allReceipts] = await Promise.all([
      purchaseRepository.list(),
      vendorRepository.list(),
      projectRepository.list(),
      materialRepository.list(),
      purchaseReceiptRepository.list(),
    ]);
    purchases = filterToVisibleProjects(user, allPurchases);
    vendors = allVendors;
    projects = filterVisibleProjectsList(user, allProjects);
    materials = allMaterials;
    receivedByPurchaseId = {} as Record<string, number>;
    for (const receipt of allReceipts) {
      receivedByPurchaseId[receipt.purchaseId] = (receivedByPurchaseId[receipt.purchaseId] ?? 0) + receipt.quantityReceived;
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Purchases couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "procurement.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Purchases"}</AdminText>}
        description={<AdminText>{"Materials bought from a vendor and invoiced against a project — the cost side of construction."}</AdminText>}
        breadcrumbs={[{ label: "Procurement", href: "/admin/procurement" }, { label: "Purchases", localize: true }]}
        primaryAction={
          canManage && (
            <Link href="/admin/procurement/purchases/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Purchase"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <PurchasesAdminExplorer
          purchases={purchases}
          vendors={vendors}
          projects={projects}
          materials={materials}
          receivedByPurchaseId={receivedByPurchaseId}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
