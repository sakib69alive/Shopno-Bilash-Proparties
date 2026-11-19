import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialForm } from "@/components/admin/procurement/MaterialForm";
import { updateMaterial } from "@/features/procurement/materialActions";
import { materialRepository, materialCategoryRepository } from "@/features/procurement/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMaterialPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this material." />
      </div>
    );
  }

  const [material, categories] = await Promise.all([materialRepository.findById(id), materialCategoryRepository.list()]);
  if (!material) notFound();

  const boundAction = updateMaterial.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={material.name}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Materials", href: "/admin/procurement/materials" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <MaterialForm action={boundAction} material={material} categories={categories} submitLabel="Save Changes" />
      </div>
    </>
  );
}
