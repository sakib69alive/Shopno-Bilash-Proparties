import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlueprintControlPanel } from "@/components/admin/blueprintAi/BlueprintControlPanel";
import { BlueprintAiTabs } from "@/components/admin/blueprintAi/BlueprintAiTabs";
import { projectContentRepository } from "@/features/projectContent/repository";
import { projectRepository } from "@/features/projects/repository";

/**
 * One place to run every project's public blueprints: replace the SVG, edit the room buttons, and choose what each public project page
 * shows. Gated on `content.update`, since it edits website project content.
 */
export default async function AdminBlueprintControlPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit project blueprints." />
      </div>
    );
  }

  const [projects, businessProjects] = await Promise.all([projectContentRepository.list(), projectRepository.list()]);
  // The client-app plans (ground floor, typical floor, parking bays) live on the business project with the same address (slug) — or, when
  // the addresses differ, the same name.
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const clientPlans = Object.fromEntries(
    projects.flatMap((p) => {
      const bp = businessProjects.find((b) => b.slug === p.slug) ?? businessProjects.find((b) => norm(b.name) === norm(p.name));
      return bp ? [[p.slug, { projectId: bp.id, plans: bp.floorPlans ?? [] }]] : [];
    }),
  );

  return (
    <>
      <AdminPageHeader
        title="Blueprint control panel"
        description="Pick a project, then replace its plans, edit the room buttons, and choose what the website shows."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Blueprint AI", href: "/admin/settings/blueprint-ai" }, { label: "Control panel" }]}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <BlueprintAiTabs active="control" />
        <BlueprintControlPanel projects={projects} clientPlans={clientPlans} />
      </div>
    </>
  );
}
