import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";
import { createCustomer } from "@/features/customers/actions";

export default async function NewCustomerPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "customer.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a customer." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"New Customer"}</AdminText>}
        breadcrumbs={[{ label: "Customers", href: "/admin/customers" }, { label: "New", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <CustomerForm action={createCustomer} submitLabel="Create Customer" />
      </div>
    </>
  );
}
