import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { InstallmentsAdminExplorer } from "@/components/admin/sales/InstallmentsAdminExplorer";
import { installmentRepository } from "@/features/sales/repository";

/**
 * Admin Step 21 — Installments Foundation. Reads `installmentRepository`
 * (the internal `types/sales.ts` `Installment` shape). `contractId` can't
 * be resolved to a customer or unit — no `Contract` repository exists yet
 * (Admin Step 9 deliberately scoped to `Sale` only), so it stays a
 * free-text field on the form too. Full create/edit/delete.
 */
export default async function AdminInstallmentsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Installments." />
      </div>
    );
  }

  let installments;
  try {
    installments = await installmentRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Installments couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canCreate = hasPermission(user.role, "sales.create");
  const canDelete = hasPermission(user.role, "sales.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Installments"}</AdminText>}
        description={<AdminText>{"Every scheduled installment against a signed contract."}</AdminText>}
        primaryAction={
          canCreate && (
            <Link href="/admin/sales/installments/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Schedule Installment"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <InstallmentsAdminExplorer installments={installments} canCreate={canCreate} canDelete={canDelete} canExplain={hasPermission(user.role, "finance.view")} />
      </div>
    </>
  );
}
