import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { VendorForm } from "@/components/admin/procurement/VendorForm";
import { createVendor } from "@/features/procurement/vendorActions";

export default async function NewVendorPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to add a vendor." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Vendor"}</AdminText>} breadcrumbs={[{ label: "Procurement", href: "/admin/procurement" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <VendorForm action={createVendor} submitLabel="Add Vendor" />
      </div>
    </>
  );
}
