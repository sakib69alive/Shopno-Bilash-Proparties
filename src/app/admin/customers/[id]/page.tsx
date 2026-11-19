import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Megaphone, Pencil, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteCustomerButton } from "@/components/admin/customers/DeleteCustomerButton";
import { PortalAccessPanel } from "@/components/admin/users/PortalAccessPanel";
import { formatDate } from "@/lib/format";
import { customerRepository } from "@/features/customers/repository";
import { userRepository } from "@/features/users/repository";
import { toPortalAccessView } from "@/features/users/portalAccessView";
import { PortalLinkControls } from "@/components/admin/users/PortalLinkControls";

interface PageProps {
  params: Promise<{ id: string }>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase"><AdminText>{label}</AdminText></p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

function CustomerAction({ href, icon: Icon, label, hint, primary, compactLabel = label }: {
  href: string;
  icon: typeof Wallet;
  label: string;
  hint: string;
  primary?: boolean;
  compactLabel?: string;
}) {
  return (
    <Link href={href} className={`${buttonVariants({ variant: primary ? "primary" : "outline", size: "sm" })} lg:border-border lg:bg-surface-raised lg:text-fg lg:hover:border-accent lg:hover:bg-surface-raised lg:focus-visible:ring-accent lg:flex lg:h-auto lg:min-w-0 lg:items-start lg:justify-start lg:gap-3 lg:rounded-lg lg:border lg:p-3.5 lg:focus-visible:ring-2`}>
      <span className={`lg:flex lg:size-9 lg:shrink-0 lg:items-center lg:justify-center lg:rounded-md ${primary ? "lg:bg-accent lg:text-accent-foreground" : "lg:bg-accent-soft lg:text-accent-strong"}`}>
        <Icon aria-hidden className="size-3.5 lg:size-4" />
      </span>
      <span className="lg:hidden"><AdminText>{compactLabel}</AdminText></span>
      <span className="hidden min-w-0 lg:block">
        <span className="text-body-sm block font-semibold"><AdminText>{label}</AdminText></span>
        <span className="text-caption text-fg-muted mt-0.5 block"><AdminText>{hint}</AdminText></span>
      </span>
    </Link>
  );
}

/**
 * Read-only overview (Admin Step 7 §10) — Sale/Payment sections come in a
 * later step. This is the stable relationship key every future module
 * (Sales, Payments, Documents, Customer Portal) will reference by
 * `customerId` (§5, §11) — the route shape matters more than what's shown
 * on the page today.
 */
export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "customer.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this customer." />
      </div>
    );
  }

  let customer;
  try {
    customer = await customerRepository.findById(id);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This customer couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!customer) notFound();

  const canUpdate = hasPermission(user.role, "customer.update");
  const canDelete = hasPermission(user.role, "customer.delete");
  const canManagePortalAccess = hasPermission(user.role, "users.manage");
  const canRecordPayment = hasPermission(user.role, "finance.manage");
  const canMakeDocuments = hasPermission(user.role, "reports.view");
  const linkedUser = customer.userId ? await userRepository.findById(customer.userId) : null;

  return (
    <>
      <AdminPageHeader
        title={customer.name}
        breadcrumbs={[{ label: "Customers", href: "/admin/customers" }, { label: customer.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={customer.status} />
            {canManagePortalAccess && (
              <PortalLinkControls
                variant="compact"
                ownerType="customer"
                ownerId={customer.id}
                ownerName={customer.name}
                phone={customer.phone}
                summary={toPortalAccessView(linkedUser)?.link}
              />
            )}
            {canUpdate && (
              <Link href={`/admin/customers/${customer.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
            {canDelete && <DeleteCustomerButton id={customer.id} name={customer.name} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        {(canRecordPayment || canMakeDocuments) && (
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-2.5">
            {canRecordPayment && (
              <CustomerAction href={`/admin/sales/payments/new?customerId=${customer.id}`} icon={Wallet} primary
                compactLabel={`${customer.name.split(" ")[0]} paid money`} label="Record a payment" hint="Open the payment form with this customer selected." />
            )}
            {canRecordPayment && (
              <CustomerAction href={`/admin/statements?customerId=${customer.id}`} icon={FileText}
                label="Payment statement" hint="Open Statements & Notices with this customer selected." />
            )}
            {canMakeDocuments && (
              <CustomerAction href="/admin/statements" icon={Megaphone}
                label="Write a notice" hint="Choose who should receive the notice in Statements & Notices." />
            )}
          </div>
        )}

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Contact"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Phone" value={customer.phone} />
            <Fact label="Alternate Phone" value={customer.alternatePhone ?? "—"} />
            <Fact label="Email" value={customer.email} />
            <Fact label="NID / Passport" value={customer.nidOrPassportNumber ?? "—"} />
          </div>
          <Fact label="Present Address" value={customer.presentAddress ?? "—"} />
          <Fact label="Permanent Address" value={customer.permanentAddress ?? "—"} />
        </section>

        <div className="flex flex-col gap-6">
          {canManagePortalAccess && (
            <PortalAccessPanel
              ownerType="customer"
              ownerId={customer.id}
              ownerName={customer.name}
              phone={customer.phone}
              linkedUser={toPortalAccessView(linkedUser)}
            />
          )}

          {customer.notes && (
            <section>
              <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Notes"}</AdminText></h2>
              <p className="text-body text-fg-muted whitespace-pre-line">{customer.notes}</p>
            </section>
          )}

          <section>
            <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
            <div className="grid grid-cols-2 gap-4">
              <Fact label="Created" value={formatDate(new Date(customer.createdAt))} />
              <Fact label="Last Updated" value={formatDate(new Date(customer.updatedAt))} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
