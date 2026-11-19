import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingForm } from "@/components/admin/sales/BookingForm";
import { createBooking } from "@/features/sales/bookingActions";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  searchParams: Promise<{ unitId?: string }>;
}

export default async function NewBookingPage({ searchParams }: PageProps) {
  const { unitId } = await searchParams;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.create")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a booking." />
      </div>
    );
  }

  const [units, customers, projects, salespeople] = await Promise.all([
    unitRepository.list(),
    customerRepository.list(),
    projectRepository.list(),
    userRepository.list(),
  ]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Booking"}</AdminText>} breadcrumbs={[{ label: "Bookings", href: "/admin/sales/bookings" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <BookingForm
          action={createBooking}
          units={units}
          customers={customers}
          projects={projects}
          salespeople={salespeople}
          submitLabel="Create Booking"
          defaultUnitId={unitId}
        />
      </div>
    </>
  );
}
