import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PurchaseForm } from "@/components/admin/procurement/PurchaseForm";
import { createPurchase } from "@/features/procurement/purchaseActions";
import { vendorRepository, materialRepository } from "@/features/procurement/repository";
import { constructionPhaseRepository } from "@/features/construction/repository";
import { projectRepository } from "@/features/projects/repository";

export default async function NewPurchasePage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record a purchase." />
      </div>
    );
  }

  const [vendors, projects, allMaterials, phases] = await Promise.all([
    vendorRepository.list(),
    projectRepository.list(),
    materialRepository.list(),
    constructionPhaseRepository.list(),
  ]);
  const materials = allMaterials.filter((m) => m.status !== "inactive");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Record Purchase"}</AdminText>}
        breadcrumbs={[{ label: "Procurement", href: "/admin/procurement" }, { label: "Purchases", href: "/admin/procurement/purchases" }, { label: "New", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <PurchaseForm action={createPurchase} vendors={vendors} projects={projects} materials={materials} phases={phases} submitLabel="Record Purchase" />
      </div>
    </>
  );
}
