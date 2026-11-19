import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { PaymentsAdminExplorer } from "@/components/admin/finance/PaymentsAdminExplorer";
import { customerPaymentRepository } from "@/features/finance/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject, filterToVisibleProjectsOptional, filterVisibleProjectsList } from "@/lib/projectScope";

interface PageProps {
  searchParams: Promise<{ projectId?: string }>;
}

/**
 * Admin Step 10 — Payments Foundation. Reads `customerPaymentRepository`
 * (the internal `types/finance/customer.ts` `CustomerPayment` shape)
 * joined against `customerRepository`/`projectRepository`. Full
 * create/edit/delete, gated on `finance.manage` — payment records are
 * Finance's domain, not Sales'.
 */
export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const { projectId: requestedProjectId } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Payments." />
      </div>
    );
  }

  let payments, customers, projects;
  try {
    const [allPayments, allCustomers, allProjects] = await Promise.all([
      customerPaymentRepository.list(),
      customerRepository.list(),
      projectRepository.list(),
    ]);
    payments = filterToVisibleProjectsOptional(user, allPayments);
    customers = allCustomers;
    projects = filterVisibleProjectsList(user, allProjects);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Payments couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");
  const initialProjectId = requestedProjectId && canAccessProject(user, requestedProjectId) ? requestedProjectId : undefined;

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Payments"}</AdminText>}
        description={<AdminText>{"Every payment a customer has made against a sale."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/sales/payments/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"Record Payment"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <PaymentsAdminExplorer
          payments={payments}
          customers={customers}
          projects={projects}
          canCreate={canManage}
          canDelete={canManage}
          initialProjectId={initialProjectId}
        />
      </div>
    </>
  );
}
