import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserForm } from "@/components/admin/users/UserForm";
import { createUser } from "@/features/users/actions";
import { projectRepository } from "@/features/projects/repository";

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "users.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create an account." />
      </div>
    );
  }

  const projects = await projectRepository.list();

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Account"}</AdminText>} breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <UserForm action={createUser} projects={projects} submitLabel="Create Account" />
      </div>
    </>
  );
}
