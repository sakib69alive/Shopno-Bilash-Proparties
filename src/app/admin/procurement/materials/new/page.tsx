import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MaterialForm } from "@/components/admin/procurement/MaterialForm";
import { createMaterial } from "@/features/procurement/materialActions";
import { materialCategoryRepository } from "@/features/procurement/repository";

export default async function NewMaterialPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a material." />
      </div>
    );
  }

  const categories = await materialCategoryRepository.list();

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Material"}</AdminText>}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Materials", href: "/admin/procurement/materials" },
          { label: "New", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <MaterialForm action={createMaterial} categories={categories} submitLabel="Add Material" />
      </div>
    </>
  );
}
