import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GalleryItemForm } from "@/components/admin/gallery/GalleryItemForm";
import { updateGalleryItem } from "@/features/gallery/actions";
import { galleryRepository } from "@/features/gallery/repository";
import { projects } from "@/content/projects";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGalleryItemPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit Gallery content." />
      </div>
    );
  }

  const item = await galleryRepository.findById(id);
  if (!item) notFound();

  const boundAction = updateGalleryItem.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={item.title ?? item.category}
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Gallery", href: "/admin/content/gallery" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <GalleryItemForm action={boundAction} item={item} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
