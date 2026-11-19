import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SaleForm } from "@/components/admin/sales/SaleForm";
import { createSale } from "@/features/sales/actions";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";
import { bookingRepository } from "@/features/sales/repository";

interface PageProps {
  searchParams: Promise<{ unitId?: string; bookingId?: string }>;
}

export default async function NewSalePage({ searchParams }: PageProps) {
  const { unitId, bookingId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to record a sale." />
      </div>
    );
  }

  const [units, customers, projects, salespeople, booking] = await Promise.all([
    unitRepository.list(),
    customerRepository.list(),
    projectRepository.list(),
    userRepository.list(),
    bookingId ? bookingRepository.findById(bookingId) : Promise.resolve(undefined),
  ]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Record Sale"}</AdminText>} breadcrumbs={[{ label: "Sales", href: "/admin/sales" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <SaleForm
          action={createSale}
          units={units}
          customers={customers}
          projects={projects}
          salespeople={salespeople}
          submitLabel="Record Sale"
          defaultUnitId={booking?.unitId ?? unitId}
          defaultCustomerId={booking?.customerId}
          defaultAgreedPrice={booking?.agreedPrice.amount}
          bookingId={booking?.id}
        />
      </div>
    </>
  );
}
