import { AdminText } from "@/components/admin/AdminLanguage";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { RemindersAdminExplorer } from "@/components/admin/reminders/RemindersAdminExplorer";
import { reminderRepository } from "@/features/reminders/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";
import { filterVisibleProjectsList, canAccessProjectOptional } from "@/lib/projectScope";

export default async function AdminRemindersPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reminders.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Reminders." />
      </div>
    );
  }

  let reminders, projects, users;
  try {
    const [allReminders, allProjects, allUsers] = await Promise.all([
      reminderRepository.list(),
      projectRepository.list(),
      userRepository.list(),
    ]);
    projects = filterVisibleProjectsList(user, allProjects);
    reminders = allReminders.filter((r) => canAccessProjectOptional(user, r.projectId));
    users = allUsers;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Reminders couldn't be loaded. Please try again." />
      </div>
    );
  }

  const canManage = hasPermission(user.role, "reminders.manage");

  return (
    <>
      <AdminPageHeader
        title={<AdminText>{"Reminders"}</AdminText>}
        description={<AdminText>{"Installment due dates, follow-ups, deadlines, and custom admin reminders."}</AdminText>}
        primaryAction={
          canManage && (
            <Link href="/admin/reminders/new" className={buttonVariants({ size: "md" })}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Reminder"}</AdminText>
            </Link>
          )
        }
      />
      <div className="p-4 sm:p-6">
        <RemindersAdminExplorer reminders={reminders} projects={projects} users={users} canManage={canManage} />
      </div>
    </>
  );
}
