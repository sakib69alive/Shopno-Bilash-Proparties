import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BulkGalleryForm } from "@/components/admin/gallery/BulkGalleryForm";
import { projectContentRepository } from "@/features/projectContent/repository";

export default async function BulkAddGalleryPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add Gallery content." />
      </div>
    );
  }
  const projects = await projectContentRepository.list();

  return (
    <>
      <AdminPageHeader
        title="Add photos"
        description="Upload many photos to the public Gallery at once."
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Gallery", href: "/admin/content/gallery" },
          { label: "Add photos" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <BulkGalleryForm projects={projects} />
      </div>
    </>
  );
}
