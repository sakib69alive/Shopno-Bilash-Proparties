import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { NotificationsAdminExplorer } from "@/components/admin/notifications/NotificationsAdminExplorer";
import { notificationRepository } from "@/features/notifications/repository";
import { userRepository } from "@/features/users/repository";

/**
 * Admin Step 17 — Notifications Foundation. Reads `notificationRepository`
 * (the internal `types/notification.ts` shape) joined against
 * `userRepository`. Full create/edit/delete for the notification record
 * itself — no email/SMS/WhatsApp provider is wired up yet
 * (`NotificationProvider` is the future dispatch interface).
 */
interface PageProps {
  searchParams: Promise<{ sent?: string; skipped?: string }>;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const { sent, skipped } = await searchParams;
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "notifications.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Notifications." />
      </div>
    );
  }

  let notifications, users;
  try {
    [notifications, users] = await Promise.all([notificationRepository.list(), userRepository.list()]);
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Notifications couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "notifications.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Notifications"}</AdminText>}
        description={<AdminText>{"Every notification the platform has sent, across every channel."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/notifications/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Notification"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        {sent && (
          <div role="status" className="bg-success-soft text-success mb-4 rounded-md px-3.5 py-3 text-body-sm">
            <AdminText>{"Sent to"}</AdminText> {sent}<AdminText>{" owner"}</AdminText>{sent === "1" ? "" : "s"}.
            {skipped && skipped !== "0" ? ` ${skipped} unit owner${skipped === "1" ? "" : "s"} in this project have no portal account yet and were skipped.` : ""}
          </div>
        )}
        <NotificationsAdminExplorer notifications={notifications} users={users} canCreate={canManage} canDelete={canManage} />
      </div>
    </>
  );
}
