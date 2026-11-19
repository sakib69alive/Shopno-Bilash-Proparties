import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ContractorsAdminExplorer } from "@/components/admin/construction/ContractorsAdminExplorer";
import { contractorRepository } from "@/features/contractors/repository";

/** Contractors — a real entity (Chapter 2 Prompt 5), replacing the old free-text-only `ConstructionPhase.contractorName`. One contractor can work on many projects/stages over time (§15), so this list carries no project filter. */
export default async function AdminContractorsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "construction.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Contractors." />
      </div>
    );
  }

  let contractors;
  try {
    contractors = await contractorRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Contractors couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "construction.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Contractors"}</AdminText>}
        description={<AdminText>{"Everyone your team assigns to construction phases and tasks."}</AdminText>}
        breadcrumbs={[{ label: "Construction", href: "/admin/construction" }, { label: "Contractors", localize: true }]}
        primaryAction={
          canManage && (
            <Link href="/admin/construction/contractors/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Add Contractor"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ContractorsAdminExplorer contractors={contractors} canCreate={canManage} canDelete={canManage} />
      </div>
    </>
  );
}
