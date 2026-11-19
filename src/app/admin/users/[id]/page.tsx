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
import { DeleteUserButton } from "@/components/admin/users/DeleteUserButton";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS } from "@/config/roles";
import { userRepository } from "@/features/users/repository";
import { customerRepository } from "@/features/customers/repository";

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
 * Read-only overview (Admin Step 15, matching the Step 5-14 pattern) —
 * invite/edit/deactivate come in a later step. `linkedShareholderId`/
 * `linkedLandownerId` are shown as raw ids — no Shareholder/Landowner
 * repository exists yet.
 */
export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser.role, "users.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this user." />
      </div>
    );
  }

  let targetUser, linkedCustomer;
  try {
    targetUser = await userRepository.findById(id);
    linkedCustomer = targetUser?.linkedCustomerId ? await customerRepository.findById(targetUser.linkedCustomerId) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This user couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!targetUser) notFound();

  const canManage = hasPermission(currentUser.role, "users.manage");

  return (
    <>
      <AdminPageHeader
        title={targetUser.name}
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: targetUser.name }]}
        secondaryActions={
          <div className="flex items-center gap-2">
            <StatusBadge status={targetUser.status} />
            {canManage && (
              <Link href={`/admin/users/${targetUser.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
            )}
            {canManage && targetUser.id !== currentUser.id && <DeleteUserButton id={targetUser.id} name={targetUser.name} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Account"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Email" value={targetUser.email} />
            <Fact label="Phone" value={targetUser.phone ?? "—"} />
            <Fact label="Role" value={ROLE_LABELS[targetUser.role]} />
            <Fact label="Last Login" value={targetUser.lastLoginAt ? formatDate(new Date(targetUser.lastLoginAt)) : "—"} />
          </div>
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Linked Records"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Customer" value={linkedCustomer?.name ?? targetUser.linkedCustomerId ?? "—"} />
            <Fact label="Shareholder" value={targetUser.linkedShareholderId ?? "—"} />
            <Fact label="Landowner" value={targetUser.linkedLandownerId ?? "—"} />
          </div>
          {linkedCustomer && (
            <Link
              href={`/admin/customers/${linkedCustomer.id}`}
              className="text-body-sm text-accent hover:text-accent-strong transition-colors"
            >
              <AdminText>{"View customer →"}</AdminText>
            </Link>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Created" value={formatDate(new Date(targetUser.createdAt))} />
            <Fact label="Last Updated" value={formatDate(new Date(targetUser.updatedAt))} />
          </div>
        </section>
      </div>
    </>
  );
}
