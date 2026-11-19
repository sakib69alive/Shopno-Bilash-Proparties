import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReminderForm } from "@/components/admin/reminders/ReminderForm";
import { updateReminder } from "@/features/reminders/actions";
import { reminderRepository } from "@/features/reminders/repository";
import { projectRepository } from "@/features/projects/repository";
import { userRepository } from "@/features/users/repository";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditReminderPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reminders.manage")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to edit this reminder." />
      </div>
    );
  }

  const [reminder, projects, users] = await Promise.all([
    reminderRepository.findById(id),
    projectRepository.list(),
    userRepository.list(),
  ]);
  if (!reminder) notFound();

  const boundAction = updateReminder.bind(null, id);

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Edit Reminder"}</AdminText>} breadcrumbs={[{ label: "Reminders", href: "/admin/reminders" }, { label: "Edit", localize: true }]} />
      <div className="p-4 sm:p-6">
        <ReminderForm action={boundAction} reminder={reminder} projects={projects} users={users} submitLabel="Save Changes" />
      </div>
    </>
  );
}
