import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { QuickOpenHub } from "@/components/admin/quickOpen/QuickOpenHub";
import { projectContentRepository } from "@/features/projectContent/repository";
import { unitContentRepository } from "@/features/unitContent/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterVisibleProjectsList } from "@/lib/projectScope";

/** Quick-open board for everything that changes the public website: pick a button, pick a project if asked, land on the exact screen. */
export default async function AdminPublicPageHub() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage the public website." />
      </div>
    );
  }

  const [webProjects, webProperties, projects] = await Promise.all([
    projectContentRepository.list(),
    unitContentRepository.list(),
    projectRepository.list(),
  ]);
  const projectNameBySlug = new Map(webProjects.map((p) => [p.slug, p.name]));

  return (
    <>
      <AdminPageHeader title="Public page" description="Pick what you want to change on the website — it takes you straight to the right screen." />
      <QuickOpenHub
        board="public"
        role={user.role}
        options={{
          webProject: webProjects.map((p) => ({ value: p.id, label: p.name, slug: p.slug })),
          webProperty: webProperties.map((u) => ({
            value: u.id,
            label: `${u.name}${projectNameBySlug.get(u.projectSlug) ? ` · ${projectNameBySlug.get(u.projectSlug)}` : ""}`,
          })),
          project: filterVisibleProjectsList(user, projects).map((p) => ({ value: p.id, label: p.name })),
          client: [],
        }}
      />
    </>
  );
}
