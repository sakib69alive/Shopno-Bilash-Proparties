import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PaymentForm } from "@/components/admin/finance/PaymentForm";
import { updatePayment } from "@/features/finance/paymentActions";
import { customerPaymentRepository } from "@/features/finance/repository";
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
  params: Promise<{ id: string }>;
}

export default async function EditPaymentPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this payment." />
      </div>
    );
  }

  const [payment, customers, projects, sales] = await Promise.all([
    customerPaymentRepository.findById(id),
    customerRepository.list(),
    projectRepository.list(),
    loadSaleOptions(),
  ]);
  if (!payment) notFound();

  const boundAction = updatePayment.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title="Edit Payment"
        breadcrumbs={[
          { label: "Payments", href: "/admin/sales/payments" },
          { label: payment.id, href: `/admin/sales/payments/${id}` },
          { label: "Edit" },
        ]}
      />
      <div className="p-4 sm:p-6">
        <PaymentForm action={boundAction} payment={payment} customers={customers} projects={projects} sales={sales} submitLabel="Save Changes" />
      </div>
    </>
  );
}
