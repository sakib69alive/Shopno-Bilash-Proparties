import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { unitContentRepository } from "@/features/unitContent/repository";
import { ProjectContentForm } from "@/components/admin/projectContent/ProjectContentForm";
import { updateProjectContent } from "@/features/projectContent/actions";
import { projectContentRepository } from "@/features/projectContent/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectContentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Projects content." />
      </div>
    );
  }

  const project = await projectContentRepository.findById(id);
  if (!project) notFound();

  const projectUnits = (await unitContentRepository.list()).filter((u) => u.projectSlug === project.slug);
  const unitStats = {
    listed: projectUnits.length,
    available: projectUnits.filter((u) => u.status === "available").length,
    manageHref: `/admin/content/properties?project=${encodeURIComponent(project.slug)}`,
    bulkHref: `/admin/content/properties/bulk?project=${encodeURIComponent(project.slug)}`,
  };

  const boundAction = updateProjectContent.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={project.name}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Projects", href: "/admin/content/projects" },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <ProjectContentForm action={boundAction} project={project} submitLabel="Save Changes" unitStats={unitStats} />
      </div>
    </>
  );
}
