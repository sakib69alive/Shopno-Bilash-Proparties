import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { SalesAdminExplorer } from "@/components/admin/sales/SalesAdminExplorer";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterToVisibleProjects, filterVisibleProjectsList } from "@/lib/projectScope";

/**
 * Admin Step 9 — Sales / Reservations Foundation. Reads `saleRepository`
 * (the internal `types/sales.ts` `Sale` shape) joined against
 * `unitRepository`/`customerRepository`/`projectRepository`. Full
 * create/edit/delete — recording a sale also marks the unit "Sold".
 */
export default async function AdminSalesPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Sales." />
      </div>
    );
  }

  let sales, units, customers, projects;
  try {
    const [allSales, allUnits, allCustomers, allProjects] = await Promise.all([
      saleRepository.list(),
      unitRepository.list(),
      customerRepository.list(),
      projectRepository.list(),
    ]);
    units = filterToVisibleProjects(user, allUnits);
    projects = filterVisibleProjectsList(user, allProjects);
    const visibleUnitIds = new Set(units.map((u) => u.id));
    sales = allSales.filter((s) => visibleUnitIds.has(s.unitId));
    customers = allCustomers;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Sales couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canCreate = hasPermission(user.role, "sales.create");
  const canDelete = hasPermission(user.role, "sales.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Sales"}</AdminText>}
        description={<AdminText>{"Every unit sold to a customer."}</AdminText>}
        primaryAction={
          canCreate && (
            <Link href="/admin/sales/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Sale"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <SalesAdminExplorer sales={sales} units={units} customers={customers} projects={projects} canCreate={canCreate} canDelete={canDelete} />
      </div>
    </>
  );
}
