import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteSaleButton } from "@/components/admin/sales/DeleteSaleButton";
import { SalePortalControls } from "@/components/admin/sales/SalePortalControls";
import { formatBDT, formatDate } from "@/lib/format";
import { saleRepository, bookingRepository } from "@/features/sales/repository";
import { unitRepository } from "@/features/units/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";
import { canAccessProject } from "@/lib/projectScope";
import { customerPaymentRepository } from "@/features/finance/repository";
import { installmentRepository } from "@/features/sales/repository";
import { INSTALLMENT_STATUS_LABEL, allocateInstallments } from "@/lib/installmentStatus";
import { summarizeSale } from "@/lib/salePayments";
import { OWNER_PAYMENT_METHOD_LABEL } from "@/lib/ownerFriendlyLabels";

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
 * Read-only overview (Admin Step 9, matching the Step 5-8 pattern) —
 * create/edit come in a later step. This is the stable relationship key
 * future modules (Payments, Installments) will reference by `saleId`;
 * `Booking`/`Contract` (also in `types/sales.ts`) are siblings sharing the
 * same unit/customer keys, not shown here — out of scope this step.
 */
export default async function AdminSaleDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "sales.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this sale." />
      </div>
    );
  }

  let sale, unit, customer, project, salesperson, booking;
  let paymentSummary: ReturnType<typeof summarizeSale> | null = null;
  let saleInstallments: Awaited<ReturnType<typeof installmentRepository.list>> = [];
  try {
    sale = await saleRepository.findById(id);
    unit = sale ? await unitRepository.findById(sale.unitId) : null;
    customer = sale ? await customerRepository.findById(sale.customerId) : null;
    project = unit ? await projectRepository.findById(unit.projectId) : null;
    if (sale) {
      const [customerSales, allPayments] = await Promise.all([
        saleRepository.list().then((all) => all.filter((x) => x.customerId === sale!.customerId)),
        customerPaymentRepository.list(),
      ]);
      paymentSummary = summarizeSale(sale, customerSales, allPayments);
      saleInstallments = (await installmentRepository.list())
        .filter((i) => i.saleId === sale!.id || (!i.saleId && i.contractId === sale!.id))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    salesperson = sale?.salespersonId ? await userRepository.findById(sale.salespersonId) : null;
    booking = sale?.bookingId ? await bookingRepository.findById(sale.bookingId) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This sale couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!sale) notFound();
  if (unit && !canAccessProject(user, unit.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This sale belongs to a project you don't have access to." />
      </div>
    );
  }

  const canUpdate = hasPermission(user.role, "sales.update");
  const canDelete = hasPermission(user.role, "sales.delete");

  return (
    <>
      <AdminPageHeader
        title={unit ? `Sale — ${unit.unitNumber}` : "Sale"}
        breadcrumbs={[{ label: "Sales", href: "/admin/sales" }, { label: unit ? unit.unitNumber : sale.id }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <Link href={`/admin/sales/${sale.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                Edit
              </Link>
            )}
            {canDelete && <DeleteSaleButton id={sale.id} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase">Unit</h2>
          {unit ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Unit" value={unit.unitNumber} />
                <Fact label="Project" value={project ? project.name : "—"} />
              </div>
              <Link
                href={`/admin/properties/${unit.id}`}
                className="text-body-sm text-accent hover:text-accent-strong transition-colors"
              >
                View unit →
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle">This unit no longer exists.</p>
          )}
        </section>

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

        <section>
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-label text-fg-subtle uppercase">Sale</h2>
            <StatusBadge status={sale.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Sale Date" value={formatDate(new Date(sale.saleDate))} />
            <Fact label="Base Price" value={formatBDT(sale.basePrice.amount)} />
            <Fact label="Final Sale Price" value={formatBDT(sale.salePrice.amount)} />
            {sale.floorPremium && <Fact label="Floor Premium" value={formatBDT(sale.floorPremium.amount)} />}
            {sale.parkingPrice && <Fact label="Parking Price" value={formatBDT(sale.parkingPrice.amount)} />}
            {sale.additionalCharges && <Fact label="Additional Charges" value={formatBDT(sale.additionalCharges.amount)} />}
            {sale.discountAmount && (
              <Fact
                label="Discount"
                value={`${formatBDT(sale.discountAmount.amount)}${sale.discountType ? ` (${sale.discountType})` : ""}${sale.discountReason ? ` — ${sale.discountReason}` : ""}`}
              />
            )}
            <Fact label="Payment Terms" value={sale.paymentTerms ?? "—"} />
            <Fact label="Salesperson" value={salesperson?.name ?? "—"} />
            {booking && <Fact label="Converted From" value={`Booking ${booking.reference ?? booking.id.slice(0, 8)}`} />}
          </div>
        </section>

        {paymentSummary && (
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-label text-fg-subtle uppercase">Payments received</h2>
              {hasPermission(user.role, "finance.manage") && (
                <Link
                  href={`/admin/sales/payments/new?customerId=${sale.customerId}&saleId=${sale.id}`}
                  className={buttonVariants({ variant: "primary", size: "sm" })}
                >
                  <Plus aria-hidden className="size-3.5" />
                  Record payment
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="border-border bg-surface-raised rounded-lg border p-4">
                <p className="text-caption text-fg-subtle uppercase">{paymentSummary.adjustmentsTotal !== 0 ? "Current price" : "Sale price"}</p>
                <p className="text-h3 text-fg mt-1">{formatBDT(paymentSummary.price)}</p>
              </div>
              <div className="border-border bg-surface-raised rounded-lg border p-4">
                <p className="text-caption text-fg-subtle uppercase">Received</p>
                <p className="text-h3 text-fg mt-1">{formatBDT(paymentSummary.paid)}</p>
              </div>
              <div className="border-border bg-surface-raised rounded-lg border p-4">
                <p className="text-caption text-fg-subtle uppercase">Remaining</p>
                <p className="text-h3 text-fg mt-1">{formatBDT(paymentSummary.remaining)}</p>
              </div>
              <div className="border-border bg-surface-raised rounded-lg border p-4">
                <p className="text-caption text-fg-subtle uppercase">Paid so far</p>
                <p className="text-h3 text-fg mt-1">{paymentSummary.percentPaid}%</p>
                <div className="bg-border mt-2 h-1 overflow-hidden rounded-full">
                  <div className="bg-accent h-full rounded-full" style={{ width: `${paymentSummary.percentPaid}%` }} />
                </div>
              </div>
            </div>

            {paymentSummary.payments.length === 0 ? (
              <p className="text-body-sm text-fg-subtle border-border mt-3 rounded-lg border border-dashed p-4">
                No payment has been recorded for this sale yet.
              </p>
            ) : (
              <div className="border-border mt-3 overflow-x-auto scrollbar-none rounded-lg border">
                <table className="text-body-sm w-full min-w-[34rem] text-left">
                  <thead className="bg-surface text-caption text-fg-subtle uppercase">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium">For</th>
                      <th className="px-4 py-2.5 font-medium">Method</th>
                      <th className="px-4 py-2.5 font-medium">Reference / receipt</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {paymentSummary.payments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-surface">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link href={`/admin/sales/payments/${pay.id}`} className="text-accent hover:text-accent-strong">
                            {formatDate(new Date(pay.date))}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{pay.category}</td>
                        <td className="px-4 py-3">{OWNER_PAYMENT_METHOD_LABEL[pay.method] ?? pay.method}</td>
                        <td className="text-fg-muted px-4 py-3">{[pay.reference, pay.receiptNumber && `Receipt ${pay.receiptNumber}`].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatBDT(pay.amount.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {paymentSummary && (
          <section className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-label text-fg-subtle uppercase">Installments</h2>
              {hasPermission(user.role, "sales.create") && (
                <Link href={`/admin/sales/installments/new?saleId=${sale.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Plus aria-hidden className="size-3.5" />
                  Add installment
                </Link>
              )}
            </div>
            {saleInstallments.length === 0 ? (
              <p className="text-body-sm text-fg-subtle border-border rounded-lg border border-dashed p-4">No installment is scheduled for this sale yet. Once added, the owner sees each one with its live status.</p>
            ) : (
              <div className="border-border overflow-x-auto scrollbar-none rounded-lg border">
                <table className="text-body-sm w-full text-left">
                  <thead className="bg-surface text-caption text-fg-subtle uppercase">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">#</th>
                      <th className="px-4 py-2.5 font-medium">Due</th>
                      <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th className="px-4 py-2.5 font-medium">Status now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {saleInstallments.map((i) => {
                      const share = allocateInstallments(saleInstallments.map((x) => ({ id: x.id, amount: x.amount.amount, status: x.status, paidDate: x.paidDate, dueDate: x.dueDate })), paymentSummary?.paid ?? 0).get(i.id);
                      return (
                      <tr key={i.id} className="hover:bg-surface">
                        <td className="px-4 py-3">
                          <Link href={`/admin/sales/installments/${i.id}`} className="text-accent hover:text-accent-strong">
                            {i.installmentNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(new Date(i.dueDate))}</td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap">{formatBDT(i.amount.amount)}</td>
                        <td className="px-4 py-3">
                          {INSTALLMENT_STATUS_LABEL[share?.status ?? "upcoming"]}
                          {share && share.paidAmount > 0 && share.remaining > 0 && <span className="text-fg-subtle block text-xs">{formatBDT(share.paidAmount)} paid · {formatBDT(share.remaining)} left</span>}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {paymentSummary && hasPermission(user.role, "sales.update") && (
          <section className="lg:col-span-2">
            <SalePortalControls
              saleId={sale.id}
              agreedPrice={paymentSummary.agreedPrice}
              adjustments={sale.priceAdjustments ?? []}
              hidden={sale.hideFromOwner === true}
            />
          </section>
        )}

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase">Record</h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(sale.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(sale.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
