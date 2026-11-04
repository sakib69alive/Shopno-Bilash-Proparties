import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteExpenseButton } from "@/components/admin/finance/DeleteExpenseButton";
import { FinancialAdjustmentForm } from "@/components/admin/finance/FinancialAdjustmentForm";
import { formatBDT, formatDate } from "@/lib/format";
import { projectExpenseRepository, cashAccountRepository, financialAdjustmentRepository } from "@/features/finance/repository";
import { projectRepository } from "@/features/projects/repository";
import { vendorRepository } from "@/features/procurement/repository";
import { contractorRepository } from "@/features/contractors/repository";
import { canAccessProject } from "@/lib/projectScope";
import { PAYMENT_METHODS, TRANSACTION_STATUSES } from "@/config/expenseCategories";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Read-only overview (Admin Step 13, matching the Step 5-12 pattern) —
 * recording/editing an expense comes in a later step. `vendorId` is shown
 * as a raw id, not a resolved name — no Vendor repository exists yet
 * (procurement is a separate, unbuilt domain).
 */
export default async function AdminExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this expense." />
      </div>
    );
  }

  let expense, project, vendor, contractor, account, adjustments;
  try {
    expense = await projectExpenseRepository.findById(id);
    project = expense ? await projectRepository.findById(expense.projectId) : null;
    vendor = expense?.vendorId ? await vendorRepository.findById(expense.vendorId) : null;
    contractor = expense?.contractorId ? await contractorRepository.findById(expense.contractorId) : null;
    account = expense?.accountId ? await cashAccountRepository.findById(expense.accountId) : null;
    adjustments = expense
      ? (await financialAdjustmentRepository.list()).filter((a) => a.targetType === "expense" && a.targetId === expense!.id)
      : [];
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This expense couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!expense) notFound();
  if (!canAccessProject(user, expense.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This expense belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "finance.manage");
  const adjustmentTotal = adjustments!.reduce((s, a) => s + a.amount.amount, 0);
  const netAmount = expense.amount.amount + adjustmentTotal;
  const paymentMethodLabel = PAYMENT_METHODS.find((m) => m.value === expense.paymentMethod)?.label;
  const statusLabel = TRANSACTION_STATUSES.find((s) => s.value === expense.status)?.label;

  return (
    <>
      <AdminPageHeader
        title={expense.description}
        breadcrumbs={[{ label: "Expenses", href: "/admin/finance/expenses" }, { label: expense.description }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/finance/expenses/${expense.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </Link>
              <DeleteExpenseButton id={expense.id} description={expense.description} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
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
            <p className="text-body-sm text-fg-subtle">This project no longer exists.</p>
          )}
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Expense</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Amount" value={formatBDT(expense.amount.amount)} />
            {adjustmentTotal !== 0 && <Fact label="Net (after adjustments)" value={formatBDT(netAmount)} />}
            <Fact label="Category" value={expense.subcategory ? `${expense.category} / ${expense.subcategory}` : expense.category} />
            <Fact label="Date" value={formatDate(new Date(expense.date))} />
            <Fact label="Payment Method" value={paymentMethodLabel ?? "—"} />
            <Fact label="Status" value={statusLabel ?? "—"} />
            <div>
              <p className="text-caption text-fg-subtle uppercase">Vendor</p>
              {vendor ? (
                <Link href={`/admin/procurement/${vendor.id}`} className="text-body-sm text-accent hover:text-accent-strong mt-0.5 block transition-colors">
                  {vendor.name}
                </Link>
              ) : (
                <p className="text-body-sm text-fg mt-0.5">—</p>
              )}
            </div>
            <div>
              <p className="text-caption text-fg-subtle uppercase">Contractor</p>
              {contractor ? (
                <Link
                  href={`/admin/construction/contractors/${contractor.id}`}
                  className="text-body-sm text-accent hover:text-accent-strong mt-0.5 block transition-colors"
                >
                  {contractor.name}
                </Link>
              ) : (
                <p className="text-body-sm text-fg mt-0.5">—</p>
              )}
            </div>
            <Fact label="Account" value={account?.name ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Reference</h2>
          <Fact label="Reference" value={expense.reference ?? "—"} />
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Adjustments / Refunds</h2>
          {adjustments!.length > 0 ? (
            <div className="border-border bg-surface-raised mb-3 overflow-x-auto scrollbar-none rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-border text-label text-fg-subtle border-b uppercase">
                    <th className="px-4 py-2 font-normal">Type</th>
                    <th className="px-4 py-2 text-right font-normal">Amount</th>
                    <th className="px-4 py-2 font-normal">Reason</th>
                    <th className="px-4 py-2 font-normal">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments!.map((a) => (
                    <tr key={a.id} className="border-border text-body-sm border-b last:border-b-0">
                      <td className="px-4 py-2 capitalize">{a.type.replace("-", " ")}</td>
                      <td className={`px-4 py-2 text-right tabular-nums ${a.amount.amount < 0 ? "text-success" : "text-fg"}`}>
                        {a.amount.amount >= 0 ? "+" : ""}
                        {formatBDT(a.amount.amount)}
                      </td>
                      <td className="px-4 py-2 text-fg-muted">{a.reason}</td>
                      <td className="px-4 py-2 text-fg-muted">{formatDate(new Date(a.date))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-body-sm text-fg-subtle mb-3">No adjustments recorded.</p>
          )}
          {canManage && <FinancialAdjustmentForm targetType="expense" targetId={expense.id} />}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(expense.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(expense.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
