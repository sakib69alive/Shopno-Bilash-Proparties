import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaymentForm } from "@/components/admin/finance/PaymentForm";
import { createPayment } from "@/features/finance/paymentActions";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";

async function loadSaleOptions() {
  const [sales, units, projects] = await Promise.all([saleRepository.list(), unitRepository.list(), projectRepository.list()]);
  return sales
    .filter((s) => s.status !== "cancelled")
    .map((s) => {
      const unit = units.find((u) => u.id === s.unitId);
      const project = projects.find((p) => p.id === s.projectId);
      return { id: s.id, customerId: s.customerId, label: `${unit?.unitNumber ?? "Flat"}${project ? ` — ${project.name}` : ""} · price ৳${s.salePrice.amount.toLocaleString("en-US")}` };
    });
}


interface PageProps {
  searchParams: Promise<{ customerId?: string; saleId?: string }>;
}

export default async function NewPaymentPage({ searchParams }: PageProps) {
  const { customerId, saleId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record a payment." />
      </div>
    );
  }

  const [customers, projects, sales] = await Promise.all([customerRepository.list(), projectRepository.list(), loadSaleOptions()]);

  return (
    <>
      <AdminPageHeader title="Record Payment" breadcrumbs={[{ label: "Payments", href: "/admin/sales/payments" }, { label: "New" }]} />
      <div className="p-4 sm:p-6">
        <PaymentForm action={createPayment} customers={customers} projects={projects} sales={sales} defaultCustomerId={customerId} defaultSaleId={saleId} submitLabel="Record Payment" />
      </div>
    </>
  );
}
