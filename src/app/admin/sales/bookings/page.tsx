import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { BookingsAdminExplorer } from "@/components/admin/sales/BookingsAdminExplorer";
import { bookingRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterVisibleProjectsList, canAccessProjectOptional } from "@/lib/projectScope";

export default async function AdminBookingsPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Bookings." />
      </div>
    );
  }

  let bookings, units, customers, projects;
  try {
    const [allBookings, allUnits, allCustomers, allProjects] = await Promise.all([
      bookingRepository.list(),
      unitRepository.list(),
      customerRepository.list(),
      projectRepository.list(),
    ]);
    projects = filterVisibleProjectsList(user, allProjects);
    bookings = allBookings.filter((b) => canAccessProjectOptional(user, b.projectId));
    units = allUnits;
    customers = allCustomers;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Bookings couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "sales.create");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Bookings"}</AdminText>}
        description={<AdminText>{"Temporary unit reservations — before a sale is confirmed."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/sales/bookings/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Booking"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <BookingsAdminExplorer bookings={bookings} units={units} customers={customers} projects={projects} canManage={canManage} />
      </div>
    </>
  );
}
