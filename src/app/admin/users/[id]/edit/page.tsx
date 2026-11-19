import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { UserForm } from "@/components/admin/users/UserForm";
import { updateUser } from "@/features/users/actions";
import { userRepository } from "@/features/users/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "users.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this account." />
      </div>
    );
  }

  const [targetUser, projects] = await Promise.all([userRepository.findById(id), projectRepository.list()]);
  if (!targetUser) notFound();

  const boundAction = updateUser.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={targetUser.name}
        breadcrumbs={[
          { label: "Users", href: "/admin/users" },
          { label: targetUser.name, href: `/admin/users/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <UserForm action={boundAction} user={targetUser} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
