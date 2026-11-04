import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InstallmentForm } from "@/components/admin/sales/InstallmentForm";
import { updateInstallment } from "@/features/sales/installmentActions";
import { installmentRepository, saleRepository } from "@/features/sales/repository";
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
  params: Promise<{ id: string }>;
}

export default async function EditInstallmentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this installment." />
      </div>
    );
  }

  const installment = await installmentRepository.findById(id);
  if (!installment) notFound();

  const boundAction = updateInstallment.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={`Edit Installment #${installment.installmentNumber}`}
        breadcrumbs={[
          { label: "Installments", href: "/admin/sales/installments" },
          { label: `#${installment.installmentNumber}`, href: `/admin/sales/installments/${id}` },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <InstallmentForm action={boundAction} installment={installment} sales={await loadSaleOptions()} submitLabel="Save Changes" />
      </div>
    </>
  );
}
