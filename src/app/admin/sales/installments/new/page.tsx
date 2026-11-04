import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InstallmentForm } from "@/components/admin/sales/InstallmentForm";
import { createInstallment } from "@/features/sales/installmentActions";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { projectRepository } from "@/features/projects/repository";
import { customerRepository } from "@/features/customers/repository";

async function loadSaleOptions() {
  const [sales, units, projects, customers] = await Promise.all([saleRepository.list(), unitRepository.list(), projectRepository.list(), customerRepository.list()]);
  return sales
    .filter((s) => s.status !== "cancelled")
    .map((s) => ({
      value: s.id,
      label: `${customers.find((c) => c.id === s.customerId)?.name ?? "Customer"} — ${units.find((u) => u.id === s.unitId)?.unitNumber ?? "Flat"}${projects.find((p) => p.id === s.projectId) ? ` · ${projects.find((p) => p.id === s.projectId)?.name}` : ""}`,
    }));
}


interface PageProps {
  searchParams: Promise<{ saleId?: string }>;
}

export default async function NewInstallmentPage({ searchParams }: PageProps) {
  const { saleId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to schedule an installment." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title="Schedule Installment" breadcrumbs={[{ label: "Installments", href: "/admin/sales/installments" }, { label: "New" }]} />
      <div className="p-4 sm:p-6">
        <InstallmentForm action={createInstallment} sales={await loadSaleOptions()} defaultSaleId={saleId} submitLabel="Schedule Installment" />
      </div>
    </>
  );
}
