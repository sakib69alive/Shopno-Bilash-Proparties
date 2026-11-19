import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GalleryItemForm } from "@/components/admin/gallery/GalleryItemForm";
import { createGalleryItem } from "@/features/gallery/actions";
import { projects } from "@/content/projects";

export default async function NewGalleryItemPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add Gallery content." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Image"}</AdminText>}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Gallery", href: "/admin/content/gallery" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <GalleryItemForm action={createGalleryItem} projects={projects} submitLabel="Publish Image" />
      </div>
    </>
  );
}
