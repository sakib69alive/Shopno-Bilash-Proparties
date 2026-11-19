import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReminderForm } from "@/components/admin/reminders/ReminderForm";
import { createReminder } from "@/features/reminders/actions";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";

export default async function NewReminderPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reminders.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to create a reminder." />
      </div>
    );
  }

  const [projects, users] = await Promise.all([projectRepository.list(), userRepository.list()]);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"New Reminder"}</AdminText>} breadcrumbs={[{ label: "Reminders", href: "/admin/reminders" }, { label: "New", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ReminderForm action={createReminder} projects={projects} users={users} submitLabel="Create Reminder" />
      </div>
    </>
  );
}
