import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SaleForm } from "@/components/admin/sales/SaleForm";
import { updateSale } from "@/features/sales/actions";
import { saleRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this sale." />
      </div>
    );
  }

  const [sale, units, customers, projects, salespeople] = await Promise.all([
    saleRepository.findById(id),
    unitRepository.list(),
    customerRepository.list(),
    projectRepository.list(),
    userRepository.list(),
  ]);
  if (!sale) notFound();

  const boundAction = updateSale.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Sale"}</AdminText>}
        breadcrumbs={[{ label: "Sales", href: "/admin/sales" }, { label: sale.id, href: `/admin/sales/${id}` }, { label: "Edit", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <SaleForm
          action={boundAction}
          sale={sale}
          units={units}
          customers={customers}
          projects={projects}
          salespeople={salespeople}
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
