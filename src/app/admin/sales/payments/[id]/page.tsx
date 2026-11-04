import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DeletePaymentButton } from "@/components/admin/finance/DeletePaymentButton";
import { formatBDT, formatDate } from "@/lib/format";
import { customerPaymentRepository } from "@/features/finance/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProjectOptional } from "@/lib/projectScope";
import type { PaymentMethod } from "@/types/finance/customer";

interface PageProps {
  params: Promise<{ id: string }>;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  "bank-transfer": "Bank Transfer",
  cheque: "Cheque",
  "mobile-banking": "Mobile Banking",
  card: "Card",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Read-only overview (Admin Step 10, matching the Step 5-9 pattern) —
 * recording/editing a payment comes in a later step. `contractId`/
 * `installmentId` are shown as raw IDs, not resolved names — no Contract
 * or Installment repository exists yet (both are separate future steps).
 */
export default async function AdminPaymentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this payment." />
      </div>
    );
  }

  let payment, customer, project;
  try {
    payment = await customerPaymentRepository.findById(id);
    customer = payment ? await customerRepository.findById(payment.customerId) : null;
    project = payment?.projectId ? await projectRepository.findById(payment.projectId) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This payment couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!payment) notFound();
  if (!canAccessProjectOptional(user, payment.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This payment belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");

  return (
    <>
      <AdminPageHeader
        title={`Payment — ${formatBDT(payment.amount.amount)}`}
        breadcrumbs={[{ label: "Payments", href: "/admin/sales/payments" }, { label: payment.id }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/statements?paymentId=${payment.id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                <Receipt aria-hidden className="size-3.5" />
                Create receipt
              </Link>
              <Link href={`/admin/sales/payments/${payment.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </Link>
              <DeletePaymentButton id={payment.id} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Customer</h2>
          {customer ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Name" value={customer.name} />
                <Fact label="Phone" value={customer.phone} />
              </div>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="text-body-sm text-accent hover:text-accent-strong transition-colors"
              >
                View customer →
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle">This customer no longer exists.</p>
          )}
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Project</h2>
          {project ? (
            <>
              <Fact label="Project" value={project.name} />
              <Link
                href={`/admin/projects/${project.id}`}
                className="text-body-sm text-accent hover:text-accent-strong transition-colors"
              >
                View project →
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle">Not linked to a project.</p>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Payment</h2>
          <div className="grid grid-cols-3 gap-4">
            <Fact label="Amount" value={formatBDT(payment.amount.amount)} />
            <Fact label="Method" value={METHOD_LABEL[payment.method]} />
            <Fact label="Date" value={formatDate(new Date(payment.date))} />
            <Fact label="Category" value={payment.category} />
            <Fact label="Receipt #" value={payment.receiptNumber ?? "—"} />
            <Fact label="Reference" value={payment.reference ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Related Records</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Contract" value={payment.contractId ?? "—"} />
            <Fact label="Installment" value={payment.installmentId ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(payment.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(payment.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
