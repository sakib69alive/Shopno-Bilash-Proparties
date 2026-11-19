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
import { DeletePurchaseButton } from "@/components/admin/procurement/DeletePurchaseButton";
import { CancelPurchaseButton } from "@/components/admin/procurement/CancelPurchaseButton";
import { ReceivePurchaseForm } from "@/components/admin/procurement/ReceivePurchaseForm";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatBDT, formatDate } from "@/lib/format";
import { purchaseRepository, purchaseReceiptRepository, vendorRepository, materialRepository } from "@/features/procurement/repository";
import { projectRepository } from "@/features/projects/repository";
import { canAccessProject } from "@/lib/projectScope";
import { derivePurchaseReceivingState } from "@/lib/materialStock";

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
 * Read-only purchase overview — one material, one quantity, one unit price,
 * plus its own real Receiving history (see `PurchaseReceipt` — physical
 * arrival is tracked separately from the purchase itself, since a purchase
 * can be ordered in full and arrive in parts).
 */
export default async function AdminPurchaseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this purchase." />
      </div>
    );
  }

  let purchase, vendor, project, material, receipts;
  try {
    purchase = await purchaseRepository.findById(id);
    vendor = purchase ? await vendorRepository.findById(purchase.vendorId) : null;
    project = purchase ? await projectRepository.findById(purchase.projectId) : null;
    material = purchase?.materialId ? await materialRepository.findById(purchase.materialId) : null;
    receipts = purchase
      ? (await purchaseReceiptRepository.list()).filter((r) => r.purchaseId === purchase!.id).sort((a, b) => b.receivedDate.localeCompare(a.receivedDate))
      : [];
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This purchase couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!purchase) notFound();
  if (!canAccessProject(user, purchase.projectId)) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="This purchase belongs to a project you don't have access to." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "procurement.manage");
  const receivingState = derivePurchaseReceivingState(purchase, receipts.reduce((s, r) => s + r.quantityReceived, 0));

  return (
    <>
      <AdminPageHeader
        title={material?.name ?? `Purchase — ${formatBDT(purchase.total.amount)}`}
        breadcrumbs={[{ label: "Purchases", href: "/admin/procurement/purchases" }, { label: purchase.id }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={purchase.paymentStatus} />
            <StatusBadge status={receivingState.status} />
            {canManage && receivingState.status === "ordered" && <CancelPurchaseButton id={purchase.id} />}
            {canManage && (
              <>
                <Link href={`/admin/procurement/purchases/${purchase.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  <AdminText>{"Edit"}</AdminText>
                </Link>
                <DeletePurchaseButton id={purchase.id} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Supplier"}</AdminText></h2>
          {vendor ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Fact label="Name" value={vendor.name} />
                <Fact label="Phone" value={vendor.phone} />
              </div>
              <Link href={`/admin/procurement/${vendor.id}`} className="text-body-sm text-accent hover:text-accent-strong transition-colors">
                <AdminText>{"View supplier →"}</AdminText>
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"This supplier no longer exists."}</AdminText></p>
          )}
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Project"}</AdminText></h2>
          {project ? (
            <>
              <Fact label="Project" value={project.name} />
              <Link href={`/admin/projects/${project.id}`} className="text-body-sm text-accent hover:text-accent-strong transition-colors">
                <AdminText>{"View project →"}</AdminText>
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"This project no longer exists."}</AdminText></p>
          )}
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Purchase"}</AdminText></h2>
          <div className="border-border bg-surface-raised grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-4">
            <Fact label="Material" value={material?.name ?? "Unknown material"} />
            <Fact label="Quantity" value={purchase.quantity !== undefined ? `${purchase.quantity.toLocaleString()} ${purchase.unit}` : "—"} />
            <Fact label="Unit Price" value={purchase.unitPrice ? formatBDT(purchase.unitPrice.amount) : "—"} />
            <Fact label="Total" value={formatBDT(purchase.total.amount)} />
            <Fact label="Purchase Date" value={purchase.purchaseDate ? formatDate(new Date(purchase.purchaseDate)) : "—"} />
            <Fact label="Invoice #" value={purchase.invoiceNumber ?? "—"} />
            <Fact label="Reference #" value={purchase.referenceNumber ?? "—"} />
            <Fact label="Payment Status" value={purchase.paymentStatus} />
          </div>
          {purchase.notes && <p className="text-body-sm text-fg-muted mt-3">{purchase.notes}</p>}
        </section>

        <section className="lg:col-span-2">
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Receiving"}</AdminText></h2>
          {purchase.materialId === undefined || purchase.quantity === undefined || !purchase.unit ? (
            <p className="text-body-sm text-fg-subtle">
              <AdminText>{"This purchase predates per-material tracking, so it has no quantity to receive against — it's kept as a historical invoice-only record."}</AdminText>
            </p>
          ) : (
            <>
              <div className="border-border bg-surface-raised mb-4 grid grid-cols-3 gap-4 rounded-lg border p-4">
                <Fact label="Ordered" value={`${purchase.quantity.toLocaleString()} ${purchase.unit}`} />
                <Fact label="Received" value={`${receivingState.receivedQuantity.toLocaleString()} ${purchase.unit}`} />
                <Fact label="Remaining" value={`${receivingState.remainingQuantity.toLocaleString()} ${purchase.unit}`} />
              </div>

              {canManage && receivingState.status !== "cancelled" && receivingState.remainingQuantity > 0 && (
                <div className="mb-4">
                  <ReceivePurchaseForm purchaseId={purchase.id} remainingQuantity={receivingState.remainingQuantity} unit={purchase.unit} />
                </div>
              )}

              {receipts.length === 0 ? (
                <EmptyState title="Nothing received yet" description="Record a receipt above once goods physically arrive — only received quantity ever becomes stock." />
              ) : (
                <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border-border flex items-center justify-between gap-3 border-b p-4 last:border-b-0">
                      <div>
                        <p className="text-body-sm text-fg font-medium">
                          {receipt.quantityReceived.toLocaleString()} {purchase.unit}<AdminText>{" received"}</AdminText>
                        </p>
                        <p className="text-caption text-fg-subtle mt-0.5">
                          {formatDate(new Date(receipt.receivedDate))}
                          {receipt.batchNumber ? ` · Batch ${receipt.batchNumber}` : ""}
                          {receipt.deliveryNote ? ` · ${receipt.deliveryNote}` : ""}
                        </p>
                        {receipt.notes && <p className="text-caption text-fg-subtle mt-0.5">{receipt.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(purchase.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(purchase.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
