import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ProjectContentAdminTable } from "@/components/admin/projectContent/ProjectContentAdminTable";
import { projectContentRepository } from "@/features/projectContent/repository";

/** List page for the Website CMS's Projects domain — same shape as CMS Step 1's News list page. */
export default async function AdminProjectContentListPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage Projects content." />
      </div>
    );
  }

  const projects = await projectContentRepository.list();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");
  const canReorder = hasPermission(user.role, "content.update");

  return (
    <>
      <AdminPageHeader
        title="Projects"
        description="Developments shown on the public Projects pages. Use the arrows to choose which come first."
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Projects" }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/projects/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              New Project
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <ProjectContentAdminTable projects={projects} canDelete={canDelete} canReorder={canReorder} />
      </div>
    </>
  );
}
