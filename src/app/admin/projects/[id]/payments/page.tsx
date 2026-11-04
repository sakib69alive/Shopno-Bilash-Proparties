import { notFound } from "next/navigation";
import Link from "next/link";
import { Wallet, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatBDT, formatDate } from "@/lib/format";
import { projectRepository } from "@/features/projects/repository";
import { customerPaymentRepository } from "@/features/finance/repository";
import { customerRepository } from "@/features/customers/repository";
import { canAccessProject } from "@/lib/projectScope";

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Payments tab — a read-focused, project-scoped view. Full CRUD lives on the global Payments page, reached here pre-filtered. */
export default async function ProjectPaymentsPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Payments." />
      </div>
    );
  }

  let project, payments, customersById;
  try {
    project = await projectRepository.findById(id);
    if (project) {
      const [allPayments, customers] = await Promise.all([customerPaymentRepository.list(), customerRepository.list()]);
      payments = allPayments.filter((p) => p.projectId === id).sort((a, b) => b.date.localeCompare(a.date));
      customersById = new Map(customers.map((c) => [c.id, c]));
    }
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Payments couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!project || !payments || !customersById) notFound();
  if (!canAccessProject(user, project.id)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This project isn't assigned to your account." />
      </div>
    );
  }

  const total = payments.reduce((sum, p) => sum + p.amount.amount, 0);

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">
          {payments.length} payment(s) recorded for this project — {formatBDT(total)} total.
        </p>
        <Link
          href={`/admin/sales/payments?projectId=${project.id}`}
          className="text-body-sm text-accent hover:text-accent-strong inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          Manage all payments <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payments recorded yet"
          description="Payments recorded against this project will appear here."
          action={
            <Link href="/admin/sales/payments/new" className="text-body-sm text-accent font-medium hover:underline">
              Record Payment
            </Link>
          }
        />
      ) : (
        <div className="border-border bg-surface-raised overflow-x-auto scrollbar-none rounded-lg border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-border text-label text-fg-subtle border-b uppercase">
                <th className="px-4 py-3 font-normal">Customer</th>
                <th className="px-4 py-3 text-right font-normal">Amount</th>
                <th className="px-4 py-3 font-normal">Method</th>
                <th className="px-4 py-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-border text-body-sm border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sales/payments/${payment.id}`} className="text-fg hover:text-accent transition-colors">
                      {customersById.get(payment.customerId)?.name ?? "Unknown customer"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatBDT(payment.amount.amount)}</td>
                  <td className="px-4 py-3 text-fg-muted capitalize">{payment.method.replace("-", " ")}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatDate(new Date(payment.date))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
