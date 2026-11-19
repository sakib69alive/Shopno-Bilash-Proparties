import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { IconButton } from "@/components/ui/IconButton";
import { buttonVariants } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { MaterialCategoryQuickForm } from "@/components/admin/procurement/MaterialCategoryQuickForm";
import { DeleteMaterialCategoryButton } from "@/components/admin/procurement/DeleteMaterialCategoryButton";
import { DeleteMaterialButton } from "@/components/admin/procurement/DeleteMaterialButton";
import { SetLifecycleStatusButton } from "@/components/admin/procurement/SetLifecycleStatusButton";
import { materialCategoryRepository, materialRepository } from "@/features/procurement/repository";
import { setMaterialCategoryStatus } from "@/features/procurement/materialCategoryActions";
import { setMaterialStatus } from "@/features/procurement/materialActions";

/**
 * Material master data — categories and the materials in them. The stock
 * ledger itself (opening/received/used/wastage per project) lives at
 * `/admin/procurement/stock`, a separate page, since it's the day-to-day
 * workflow while this page is closer to one-time setup.
 */
export default async function AdminMaterialsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view materials." />
      </div>
    );
  }

  let categories, materials;
  try {
    [categories, materials] = await Promise.all([materialCategoryRepository.list(), materialRepository.list()]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Materials couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "procurement.manage");
  const materialsByCategory = new Map<string, typeof materials>();
  for (const m of materials) {
    const list = materialsByCategory.get(m.categoryId) ?? [];
    list.push(m);
    materialsByCategory.set(m.categoryId, list);
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Materials"}</AdminText>}
        description={<AdminText>{"Construction material categories and the materials tracked in stock."}</AdminText>}
        breadcrumbs={[{ label: "Procurement", href: "/admin/procurement" }, { label: "Materials", localize: true }]}
        primaryAction={
          canManage &&
          categories.length > 0 && (
            <Link href="/admin/procurement/materials/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Material"}</AdminText>
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        {canManage && (
          <section className="border-border bg-surface-raised rounded-lg border p-4">
            <MaterialCategoryQuickForm />
          </section>
        )}

        {categories.length === 0 ? (
          <EmptyState title="No material categories yet" description="Add a category above (e.g. Cement, Rebar, Electrical) to start tracking materials." />
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map((category) => {
              const items = materialsByCategory.get(category.id) ?? [];
              return (
                <section key={category.id} className="border-border bg-surface-raised rounded-lg border p-4">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-label text-fg-subtle uppercase">{category.name}</h2>
                      <StatusBadge status={category.status === "inactive" ? "inactive" : "active"} />
                    </div>
                    {canManage && (
                      <span className="flex items-center gap-1">
                        <SetLifecycleStatusButton
                          status={category.status}
                          label={category.name}
                          onSetStatus={setMaterialCategoryStatus.bind(null, category.id)}
                        />
                        <DeleteMaterialCategoryButton id={category.id} name={category.name} />
                      </span>
                    )}
                  </div>
                  {category.description && <p className="text-caption text-fg-subtle mb-3">{category.description}</p>}
                  {items.length === 0 ? (
                    <p className="text-body-sm text-fg-subtle"><AdminText>{"No materials in this category yet."}</AdminText></p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {items.map((material) => (
                        <div key={material.id} className="bg-surface flex items-center justify-between gap-3 rounded-md px-3 py-2">
                          <Link href={`/admin/procurement/materials/${material.id}`} className="text-body-sm text-fg hover:text-accent transition-colors">
                            {material.name}
                            {material.brand ? <span className="text-fg-subtle"> · {material.brand}</span> : null}
                            <span className="text-fg-subtle"> · {material.unit}</span>
                          </Link>
                          <span className="flex items-center gap-1">
                            <StatusBadge status={material.status === "inactive" ? "inactive" : "active"} />
                            {canManage && (
                              <>
                                <SetLifecycleStatusButton
                                  status={material.status}
                                  label={material.name}
                                  onSetStatus={setMaterialStatus.bind(null, material.id)}
                                />
                                <Link href={`/admin/procurement/materials/${material.id}/edit`}>
                                  <IconButton icon={Pencil} label={`Edit ${material.name}`} size="sm" />
                                </Link>
                                <DeleteMaterialButton id={material.id} name={material.name} />
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
