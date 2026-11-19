import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { LandownersAdminExplorer } from "@/components/admin/landowners/LandownersAdminExplorer";
import { landownerRepository, agreementRepository } from "@/features/landowners/repository";
import { filterToVisibleProjectsOptional, getVisibleProjectIds } from "@/lib/projectScope";

/**
 * Landowner Foundation. Reads `landownerRepository`/`agreementRepository`
 * (`types/landowner.ts`), gated on `landowner.view`/`landowner.manage`.
 * Full create/edit/delete for both the person and their JV agreements.
 */
export default async function AdminLandownersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "landowner.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Landowners." />
      </div>
    );
  }

  let landowners, agreements;
  try {
    const [allLandowners, allAgreements] = await Promise.all([landownerRepository.list(), agreementRepository.list()]);
    agreements = filterToVisibleProjectsOptional(user, allAgreements);
    if (getVisibleProjectIds(user) === "all") {
      landowners = allLandowners;
    } else {
      const visibleLandownerIds = new Set(agreements.map((a) => a.landownerId));
      landowners = allLandowners.filter((l) => visibleLandownerIds.has(l.id));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Landowners couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "landowner.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Landowners"}</AdminText>}
        description={<AdminText>{"People bringing land into a joint-venture development instead of buying a unit."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/landowners/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Landowner"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <LandownersAdminExplorer landowners={landowners} agreements={agreements} canCreate={canManage} canDelete={canManage} />
      </div>
    </>
  );
}
