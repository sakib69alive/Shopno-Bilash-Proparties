import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { MilestoneAdminTable } from "@/components/admin/story/MilestoneAdminTable";
import { listMilestonesSorted } from "@/features/companyMilestones/repository";

/** List page for the public About page's "Our Story" timeline. */
export default async function AdminStoryListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage the Our Story timeline." />
      </div>
    );
  }

  const milestones = await listMilestonesSorted();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Our Story"}</AdminText>}
        description={<AdminText>{"The timeline shown on the public About page, oldest first."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Our Story", localize: true }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/story/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Entry"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <MilestoneAdminTable milestones={milestones} canDelete={canDelete} />
      </div>
    </>
  );
}
