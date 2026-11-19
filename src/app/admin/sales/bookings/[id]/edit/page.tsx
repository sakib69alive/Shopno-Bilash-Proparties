import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingForm } from "@/components/admin/sales/BookingForm";
import { updateBooking } from "@/features/sales/bookingActions";
import { bookingRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookingPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.update")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this booking." />
      </div>
    );
  }

  const [booking, units, customers, projects, salespeople] = await Promise.all([
    bookingRepository.findById(id),
    unitRepository.list(),
    customerRepository.list(),
    projectRepository.list(),
    userRepository.list(),
  ]);
  if (!booking) notFound();

  const boundAction = updateBooking.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Edit Booking"}</AdminText>}
        breadcrumbs={[{ label: "Bookings", href: "/admin/sales/bookings" }, { label: "Edit", localize: true }]}
      />
      <div className="p-4 sm:p-6">
        <BookingForm
          action={boundAction}
          booking={booking}
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
