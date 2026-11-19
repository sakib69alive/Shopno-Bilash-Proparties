import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { VendorForm } from "@/components/admin/procurement/VendorForm";
import { updateVendor } from "@/features/procurement/vendorActions";
import { vendorRepository } from "@/features/procurement/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this vendor." />
      </div>
    );
  }

  const vendor = await vendorRepository.findById(id);
  if (!vendor) notFound();

  const boundAction = updateVendor.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={vendor.name}
        breadcrumbs={[
          { label: "Procurement", href: "/admin/procurement" },
          { label: vendor.name, href: `/admin/procurement/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <VendorForm action={boundAction} vendor={vendor} submitLabel="Save Changes" />
      </div>
    </>
  );
}
