import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ShareholdersAdminExplorer } from "@/components/admin/shareholders/ShareholdersAdminExplorer";
import { shareholderRepository, shareholdingRepository } from "@/features/shareholders/repository";
import { filterToVisibleProjects, getVisibleProjectIds } from "@/lib/projectScope";

/**
 * Shareholder Foundation. Reads `shareholderRepository`/
 * `shareholdingRepository` (`types/shareholder.ts`), gated on
 * `shareholder.view`/`shareholder.manage`. Full create/edit/delete for
 * both the person and their per-project stakes.
 */
export default async function AdminShareholdersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "shareholder.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Shareholders." />
      </div>
    );
  }

  let shareholders, shareholdings;
  try {
    const [allShareholders, allShareholdings] = await Promise.all([shareholderRepository.list(), shareholdingRepository.list()]);
    shareholdings = filterToVisibleProjects(user, allShareholdings);
    // A shareholder with zero holdings left in scope isn't shown at all — no reason for a
    // project-scoped viewer to see a person's contact info with nothing relevant attached.
    if (getVisibleProjectIds(user) === "all") {
      shareholders = allShareholders;
    } else {
      const visibleShareholderIds = new Set(shareholdings.map((h) => h.shareholderId));
      shareholders = allShareholders.filter((s) => visibleShareholderIds.has(s.id));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Shareholders couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "shareholder.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Shareholders"}</AdminText>}
        description={<AdminText>{"Everyone with a stake in a project, and what they're owed back."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/shareholders/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Shareholder"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ShareholdersAdminExplorer shareholders={shareholders} shareholdings={shareholdings} canCreate={canManage} canDelete={canManage} />
      </div>
    </>
  );
}
