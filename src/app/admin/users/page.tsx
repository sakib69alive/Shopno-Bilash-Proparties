import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { UsersAdminExplorer } from "@/components/admin/users/UsersAdminExplorer";
import { userRepository } from "@/features/users/repository";

/**
 * Admin Step 15 — Users Foundation. Reads `userRepository` (the same
 * `User` repository Admin Step 3 built for authentication). Full
 * create/edit/delete — creating an account also sets its password
 * (`Credential` table), the same login path the bootstrap account uses.
 * A user can't delete their own account while signed in as it.
 */
export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "users.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Users." />
      </div>
    );
  }

  let users;
  try {
    users = await userRepository.list();
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Users couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "users.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Users"}</AdminText>}
        description={<AdminText>{"Every staff and portal account with access to this platform."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/users/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Account"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <UsersAdminExplorer users={users} currentUserId={user.id} canManage={canManage} />
      </div>
    </>
  );
}
