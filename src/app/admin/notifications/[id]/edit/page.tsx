import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NotificationForm } from "@/components/admin/notifications/NotificationForm";
import { updateNotification } from "@/features/notifications/actions";
import { notificationRepository } from "@/features/notifications/repository";
import { userRepository } from "@/features/users/repository";
import { projectRepository } from "@/features/projects/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditNotificationPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "notifications.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this notification." />
      </div>
    );
  }

  const [notification, users, projects] = await Promise.all([
    notificationRepository.findById(id),
    userRepository.list(),
    projectRepository.list(),
  ]);
  if (!notification) notFound();

  const boundAction = updateNotification.bind(null, id);

  return (
    <>
      <AdminPageHeader
        title={notification.title}
        breadcrumbs={[
          { label: "Notifications", href: "/admin/notifications" },
          { label: notification.title, href: `/admin/notifications/${id}` },
          { label: "Edit", localize: true },
        ]}
      />
      <div className="p-4 sm:p-6">
        <NotificationForm action={boundAction} notification={notification} users={users} projects={projects} submitLabel="Save Changes" />
      </div>
    </>
  );
}
