import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteInstallmentButton } from "@/components/admin/sales/DeleteInstallmentButton";
import { formatBDT, formatDate } from "@/lib/format";
import { installmentRepository } from "@/features/sales/repository";

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
 * Read-only overview (Admin Step 21, matching the Step 5-20 pattern) —
 * recording/marking-paid come in a later step. `contractId` is shown as
 * a raw id — no Contract repository exists yet to resolve it further.
 */
export default async function AdminInstallmentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this installment." />
      </div>
    );
  }

  let installment;
  try {
    installment = await installmentRepository.findById(id);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This installment couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!installment) notFound();

  const canUpdate = hasPermission(user.role, "sales.update");
  const canDelete = hasPermission(user.role, "sales.delete");

  return (
    <>
      <AdminPageHeader
        title={`Installment #${installment.installmentNumber}`}
        breadcrumbs={[
          { label: "Installments", href: "/admin/sales/installments" },
          { label: `#${installment.installmentNumber}` },
        ]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={installment.status} />
            {canUpdate && (
              <Link href={`/admin/sales/installments/${installment.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
            {canDelete && <DeleteInstallmentButton id={installment.id} installmentNumber={installment.installmentNumber} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Schedule"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Installment #" value={String(installment.installmentNumber)} />
            <Fact label="Contract" value={installment.contractId} />
            <Fact label="Amount" value={formatBDT(installment.amount.amount)} />
            <Fact label="Due Date" value={formatDate(new Date(installment.dueDate))} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Payment"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Paid Date" value={installment.paidDate ? formatDate(new Date(installment.paidDate)) : "Not paid yet"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(installment.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(installment.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
