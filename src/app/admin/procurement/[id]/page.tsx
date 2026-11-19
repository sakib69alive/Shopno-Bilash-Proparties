import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteVendorButton } from "@/components/admin/procurement/DeleteVendorButton";
import { SetLifecycleStatusButton } from "@/components/admin/procurement/SetLifecycleStatusButton";
import { formatBDT, formatDate } from "@/lib/format";
import { vendorRepository, purchaseRepository, materialRepository } from "@/features/procurement/repository";
import { setVendorStatus } from "@/features/procurement/vendorActions";
import { projectRepository } from "@/features/projects/repository";

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
 * Read-only vendor overview — every purchase recorded against this vendor,
 * joined against `projectRepository` so each row links back to its project.
 */
export default async function AdminVendorDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "procurement.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this vendor." />
      </div>
    );
  }

  let vendor, purchases, projects, materialsById;
  try {
    vendor = await vendorRepository.findById(id);
    const allPurchases = vendor ? await purchaseRepository.list() : [];
    purchases = allPurchases.filter((p) => p.vendorId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    projects = await projectRepository.list();
    materialsById = new Map((await materialRepository.list()).map((m) => [m.id, m]));
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This vendor couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!vendor) notFound();

  const canManage = hasPermission(user.role, "procurement.manage");
  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const totalSpent = purchases.reduce((sum, p) => sum + p.total.amount, 0);

  return (
    <>
      <AdminPageHeader
        title={vendor.name}
        breadcrumbs={[{ label: "Procurement", href: "/admin/procurement" }, { label: vendor.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={vendor.status === "inactive" ? "inactive" : "active"} />
            {canManage && (
              <>
                <SetLifecycleStatusButton status={vendor.status} label={vendor.name} onSetStatus={setVendorStatus.bind(null, vendor.id)} />
                <Link href={`/admin/procurement/${vendor.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Pencil aria-hidden className="size-3.5" />
                  <AdminText>{"Edit"}</AdminText>
                </Link>
                <DeleteVendorButton id={vendor.id} name={vendor.name} />
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Contact"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Company" value={vendor.companyName ?? "—"} />
              <Fact label="Contact Person" value={vendor.contactPerson ?? "—"} />
              <Fact label="Phone" value={vendor.phone} />
              <Fact label="Email" value={vendor.email ?? "—"} />
              <Fact label="Address" value={vendor.address ?? "—"} />
              <Fact label="Categories" value={vendor.categories.length > 0 ? vendor.categories.join(", ") : "—"} />
            </div>
            {vendor.businessInfo && <p className="text-body-sm text-fg-muted mt-2">{vendor.businessInfo}</p>}
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase">Total Spent</h2>
            <div className="border-border bg-surface-raised rounded-lg border p-4">
              <p className="text-title-md text-fg font-semibold">{formatBDT(totalSpent)}</p>
              <p className="text-caption text-fg-subtle mt-1">
                <AdminText>{"Across "}</AdminText>{purchases.length} {purchases.length === 1 ? "purchase" : "purchases"}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(vendor.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(vendor.updatedAt))} />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Purchases"}</AdminText></h2>
          {purchases.length === 0 ? (
            <EmptyState title="No purchases yet" description="Purchases recorded against this vendor will appear here." />
          ) : (
            <div className="border-border bg-surface-raised flex flex-col rounded-lg border">
              {purchases.map((purchase) => {
                const project = projectsById.get(purchase.projectId);
                return (
                  <Link
                    key={purchase.id}
                    href={`/admin/procurement/purchases/${purchase.id}`}
                    className="border-border hover:bg-surface flex items-center justify-between gap-3 border-b p-4 transition-colors last:border-b-0"
                  >
                    <div>
                      <p className="text-body-sm text-fg font-medium">
                        {(purchase.materialId ? materialsById.get(purchase.materialId) : undefined)?.name ?? "Unknown material"}
                      </p>
                      <p className="text-caption text-fg-subtle mt-0.5">
                        {project?.name ?? "Unknown project"}
                        {purchase.quantity !== undefined ? ` · ${purchase.quantity} ${purchase.unit}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-body-sm text-fg tabular-nums">{formatBDT(purchase.total.amount)}</span>
                      <StatusBadge status={purchase.paymentStatus} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
