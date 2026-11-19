import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NotificationForm } from "@/components/admin/notifications/NotificationForm";
import { createNotification } from "@/features/notifications/actions";
import { userRepository } from "@/features/users/repository";
import { projectRepository } from "@/features/projects/repository";

export default async function NewNotificationPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "notifications.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a notification." />
      </div>
    );
  }

  const [users, projects] = await Promise.all([userRepository.list(), projectRepository.list()]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Notification"}</AdminText>} breadcrumbs={[{ label: "Notifications", href: "/admin/notifications" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <NotificationForm action={createNotification} users={users} projects={projects} submitLabel="Create Notification" />
      </div>
    </>
  );
}
