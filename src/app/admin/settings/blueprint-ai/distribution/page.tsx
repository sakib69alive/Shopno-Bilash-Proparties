import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlueprintAiTabs } from "@/components/admin/blueprintAi/BlueprintAiTabs";
import { BlueprintDistribution, type DistProject } from "@/components/admin/blueprintAi/BlueprintDistribution";
import { projectRepository } from "@/features/projects/repository";
import { projectContentRepository } from "@/features/projectContent/repository";
import { unitRepository } from "@/features/units/repository";
import { floorRepository } from "@/features/floors/repository";
import { customerRepository } from "@/features/customers/repository";
import { saleRepository } from "@/features/sales/repository";
import { parkingRepository } from "@/features/parking/repository";

export const dynamic = "force-dynamic";

/** Project → its clients → which plan each one gets and whether they see it, with a live preview of the client's app and the public page. */
export default async function AdminBlueprintDistributionPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "customer.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to distribute blueprints to clients." />
      </div>
    );
  }

  const [projects, content, units, floors, customers, sales, parkingAll] = await Promise.all([
    projectRepository.list(),
    projectContentRepository.list(),
    unitRepository.list(),
    floorRepository.list(),
    customerRepository.list(),
    saleRepository.list(),
    parkingRepository.list(),
  ]);

  const data: DistProject[] = projects.map((p) => {
    const clients = units
      .filter((u) => u.projectId === p.id)
      .flatMap((u) => {
        const sale = sales.find((s) => s.unitId === u.id && s.status !== "cancelled");
        const customerId = u.customerId ?? sale?.customerId;
        const customer = customerId ? customers.find((c) => c.id === customerId) : undefined;
        if (!customer) return [];
        return [
          {
            unitId: u.id,
            customerId: customer.id,
            unitNumber: u.unitNumber,
            floorNumber: floors.find((f) => f.id === u.floorId)?.floorNumber,
            customerName: customer.name,
            layoutImage: u.layoutImage,
            unitTypeId: u.unitTypeId,
            planFloorPlanId: u.planFloorPlanId,
            hidePlan: !!u.hidePlanFromOwner,
          },
        ];
      })
      .sort((a, b) => a.customerName.localeCompare(b.customerName) || a.unitNumber.localeCompare(b.unitNumber));

    return {
      id: p.id,
      name: p.name,
      floorPlans: (p.floorPlans ?? []).filter((fp) => fp.image),
      unitTypes: p.unitTypes ?? [],
      clients,
      parking: parkingAll
        .filter((b) => b.projectId === p.id)
        .map((b) => ({ id: b.id, number: b.parkingNumber, ownerId: b.ownerType === "customer" ? b.ownerId : undefined, otherOwner: b.ownerType !== "customer" && !!b.ownerId }))
        .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
      publicProject: content.find((c) => c.slug === p.slug) ?? null,
    };
  });

  return (
    <>
      <AdminPageHeader
        title="Blueprint distribution"
        description="Pick a project, then choose which plan each client gets and whether they see it."
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Blueprint AI", href: "/admin/settings/blueprint-ai" }, { label: "Distribution" }]}
      />
      <div className="flex flex-col gap-6 p-4 sm:p-6">
        <BlueprintAiTabs active="distribution" />
        <BlueprintDistribution projects={data} />
      </div>
    </>
  );
}
