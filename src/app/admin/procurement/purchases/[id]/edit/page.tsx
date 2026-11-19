import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PurchaseForm } from "@/components/admin/procurement/PurchaseForm";
import { updatePurchase } from "@/features/procurement/purchaseActions";
import { purchaseRepository, purchaseReceiptRepository, vendorRepository, materialRepository } from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPurchasePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this purchase." />
      </div>
    );
  }

  const [purchase, vendors, projects, allMaterials, receipts, phases] = await Promise.all([
    purchaseRepository.findById(id),
    vendorRepository.list(),
    projectRepository.list(),
    materialRepository.list(),
    purchaseReceiptRepository.list(),
    constructionPhaseRepository.list(),
  ]);
  if (!purchase) notFound();

  const materials = allMaterials.filter((m) => m.status !== "inactive" || m.id === purchase.materialId);
  const locked = receipts.some((r) => r.purchaseId === id);
  const boundAction = updatePurchase.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Purchase"}</AdminText>}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: "Purchases", href: "/admin/procurement/purchases" },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PurchaseForm
          action={boundAction}
          purchase={purchase}
          vendors={vendors}
          projects={projects}
          materials={materials}
          phases={phases}
          submitLabel="Save Changes"
          locked={locked}
        />
      </div>
    </>
  );
}
