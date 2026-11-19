import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { VendorsAdminExplorer } from "@/components/admin/procurement/VendorsAdminExplorer";
import { vendorRepository } from "@/features/procurement/repository";

/**
 * Procurement Foundation — Vendors. Reads `vendorRepository`
 * (`types/procurement.ts`'s `Vendor`), gated on `procurement.view`/
 * `procurement.manage` (already wired into `ROLE_PERMISSIONS` for
 * `procurement_manager` and the apex roles). Full create/edit/delete.
 */
export default async function AdminProcurementPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Procurement." />
      </div>
    );
  }

  let vendors;
  try {
    vendors = await vendorRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Vendors couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "procurement.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Vendors"}</AdminText>}
        description={<AdminText>{"Everyone your team buys construction materials and supplies from."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/procurement/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Vendor"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <VendorsAdminExplorer vendors={vendors} canCreate={canManage} canDelete={canManage} />
      </div>
    </>
  );
}
