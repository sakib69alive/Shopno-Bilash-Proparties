import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { ImagePlus, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { GalleryAdminGrid } from "@/components/admin/gallery/GalleryAdminGrid";
import { galleryRepository } from "@/features/gallery/repository";

export default async function AdminGalleryListPage({ searchParams }: { searchParams: Promise<{ added?: string }> }) {
  const { added } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "content.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to manage Gallery content." />
      </div>
    );
  }

  const items = await galleryRepository.list();
  const canCreate = hasPermission(user.role, "content.create");
  const canDelete = hasPermission(user.role, "content.delete");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Gallery"}</AdminText>}
        description={<AdminText>{"Images shown on the public Gallery page."}</AdminText>}
        breadcrumbs={[{ label: "Content", href: "/admin/content" }, { label: "Gallery", localize: true }]}
        primaryAction={
          canCreate && (
            <div className="flex gap-2">
              <Link href="/admin/content/gallery/bulk" className={buttonVariants({ size: "md" })}>
                <ImagePlus aria-hidden className="size-4" />
                <AdminText>{"Add photos"}</AdminText>
              </Link>
              <Link href="/admin/content/gallery/new" className={buttonVariants({ variant: "outline", size: "md" })}>
                <Plus aria-hidden className="size-4" />
                <AdminText>{"Single image"}</AdminText>
              </Link>
            </div>
          )
        }
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {added && (
          <p role="status" className="bg-success-soft text-success rounded-md px-3.5 py-3 text-sm">
            <AdminText>{"Added "}</AdminText>{added} {added === "1" ? "photo" : "photos"}. Open any to add a title or caption.
          </p>
        )}
        <GalleryAdminGrid items={items} canDelete={canDelete} />
      </div>
    </>
  );
}
