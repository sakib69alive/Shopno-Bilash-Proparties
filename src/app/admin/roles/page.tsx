import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ROLES, ROLE_LABELS, STAFF_ROLES, PORTAL_ROLES } from "@/config/roles";
import { ROLE_PERMISSIONS, PERMISSIONS } from "@/config/permissions";

const TOTAL_PERMISSIONS = Object.values(PERMISSIONS).flat().length;

/**
 * Admin Step 16 — Roles & Permissions Foundation. Unlike every module
 * before it, there is no repository here: roles and permissions are
 * source-controlled config (`config/roles.ts`, `config/permissions.ts`),
 * not runtime data, so this page reads that config directly rather than
 * a `Repository<T>` — a viewer, not a CRUD foundation. Editing the matrix
 * is a much larger, higher-stakes step (changing it can lock staff out of
 * the platform) and is explicitly not attempted here.
 */
export default async function AdminRolesPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "roles.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Roles & Permissions." />
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Roles & Permissions"}</AdminText>}
        description={<AdminText>{"What every role can see and do — read-only. Editing the matrix is a separate, larger step."}</AdminText>}
      />
      <div className="flex flex-col gap-8 p-4 sm:p-6">
        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Staff Roles (Admin)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STAFF_ROLES.map((role) => (
              <RoleCard key={role} role={role} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-3 uppercase">Portal Roles</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PORTAL_ROLES.map((role) => (
              <RoleCard key={role} role={role} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function RoleCard({ role }: { role: (typeof ROLES)[number] }) {
  const grantedCount = ROLE_PERMISSIONS[role].length;
  return (
    <Link
      href={`/admin/roles/${role}`}
      className="border-border bg-surface-raised hover:border-accent flex flex-col gap-2 rounded-lg border p-4 transition-colors"
    >
      <h3 className="text-body-sm text-fg font-semibold">{ROLE_LABELS[role]}</h3>
      <p className="text-caption text-fg-subtle">
        {grantedCount} of {TOTAL_PERMISSIONS}<AdminText>{" permissions"}</AdminText>
      </p>
    </Link>
  );
}
