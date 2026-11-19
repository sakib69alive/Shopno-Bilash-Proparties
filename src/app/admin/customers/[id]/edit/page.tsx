import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";
import { updateCustomer } from "@/features/customers/actions";
import { customerRepository } from "@/features/customers/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "customer.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this customer." />
      </div>
    );
  }

  const customer = await customerRepository.findById(id);
  if (!customer) notFound();

  const boundAction = updateCustomer.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={customer.name}
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          { label: customer.name, href: `/admin/customers/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <CustomerForm action={boundAction} customer={customer} submitLabel="Save Changes" />
      </div>
    </>
  );
}
