import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { ProjectContentAdminTable } from "@/components/admin/projectContent/ProjectContentAdminTable";
import { HomeFeaturedProjectsEditor } from "@/components/admin/projectContent/HomeFeaturedProjectsEditor";
import { getHomeFeaturedProjects } from "@/features/projectContent/homeFeatured";
import { projectContentRepository } from "@/features/projectContent/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";

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

  const [projects, settings] = await Promise.all([
    projectContentRepository.list(),
    companySettingsRepository.findById(COMPANY_SETTINGS_ID),
  ]);
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");
  const canReorder = hasPermission(user.role, "content.update");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Projects"}</AdminText>}
        description={<AdminText>{"Developments shown on the public Projects pages. Use the arrows to choose which come first."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Projects", localize: true }]}
        primaryAction={
          canCreate && (
            <Link href="/admin/content/projects/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Project"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <HomeFeaturedProjectsEditor
          projects={projects.map(({ id, name, location }) => ({ id, name, location }))}
          savedIds={settings?.homeFeaturedProjectIds ?? null}
          defaultIds={getHomeFeaturedProjects(projects).map((project) => project.id)}
          canEdit={canReorder && Boolean(settings)}
        />
        <ProjectContentAdminTable projects={projects} canDelete={canDelete} canReorder={canReorder} />
      </div>
    </>
  );
}
