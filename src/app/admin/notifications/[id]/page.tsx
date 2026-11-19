import { AdminText } from "@/components/admin/AdminLanguage";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buttonVariants } from "@/components/ui/Button";
import { DeleteNotificationButton } from "@/components/admin/notifications/DeleteNotificationButton";
import { Media } from "@/components/ui/Media";
import { formatDate } from "@/lib/format";
import { notificationRepository } from "@/features/notifications/repository";
import { userRepository } from "@/features/users/repository";
import type { NotificationChannel, NotificationEvent } from "@/types/notification";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EVENT_LABEL: Record<NotificationEvent, string> = {
  "payment.received": "Payment Received",
  "payment.due": "Payment Due",
  "payment.overdue": "Payment Overdue",
  "booking.confirmed": "Booking Confirmed",
  "document.uploaded": "Document Uploaded",
  "construction.milestone-reached": "Construction Milestone Reached",
  "project.updated": "Project Updated",
  "lead.new-inquiry": "New Lead Enquiry",
  "lead.follow-up-reminder": "Lead Follow-up Reminder",
  "approval.requested": "Approval Requested",
};

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  "in-app": "In-App",
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-caption text-fg-subtle uppercase">{label}</p>
      <p className="text-body-sm text-fg mt-0.5">{value}</p>
    </div>
  );
}

/**
 * Read-only overview (Admin Step 17, matching the Step 5-16 pattern) —
 * sending/resending come in a later step. `relatedEntityId` is shown as a
 * raw id — `types/notification.ts` doesn't carry a type discriminator for
 * it, so it can't be safely resolved to any one repository.
 */
export default async function AdminNotificationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "notifications.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view this notification." />
      </div>
    );
  }

  let notification, recipient;
  try {
    notification = await notificationRepository.findById(id);
    recipient = notification ? await userRepository.findById(notification.recipientUserId) : null;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="This notification couldn't be loaded. Please try again." />
      </div>
    );
  }

  if (!notification) notFound();

  const canManage = hasPermission(user.role, "notifications.manage");

  return (
    <>
      <AdminPageHeader
        title={notification.title}
        breadcrumbs={[{ label: "Notifications", href: "/admin/notifications" }, { label: notification.title }]}
        secondaryActions={
          canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/notifications/${notification.id}/edit`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Pencil aria-hidden className="size-3.5" />
                <AdminText>{"Edit"}</AdminText>
              </Link>
              <DeleteNotificationButton id={notification.id} title={notification.title} />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Recipient"}</AdminText></h2>
          {recipient ? (
            <>
              <Fact label="Name" value={recipient.name} />
              <Link
                href={`/admin/users/${recipient.id}`}
                className="text-body-sm text-accent hover:text-accent-strong transition-colors"
              >
                <AdminText>{"View user →"}</AdminText>
              </Link>
            </>
          ) : (
            <p className="text-body-sm text-fg-subtle"><AdminText>{"This user no longer exists."}</AdminText></p>
          )}
        </section>

        <section className="border-border bg-surface-raised flex flex-col gap-4 rounded-lg border p-4">
          <h2 className="text-label text-fg-subtle uppercase"><AdminText>{"Delivery"}</AdminText></h2>
          <div className="grid grid-cols-2 gap-4">
            <Fact label="Event" value={EVENT_LABEL[notification.event]} />
            <Fact label="Channel" value={CHANNEL_LABEL[notification.channel]} />
            <Fact label="Read At" value={notification.readAt ? formatDate(new Date(notification.readAt)) : "Unread"} />
            <Fact label="Related Record" value={notification.relatedEntityId ?? "—"} />
          </div>
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Message"}</AdminText></h2>
          <p className="text-body text-fg-muted whitespace-pre-line">{notification.body}</p>
          {notification.imageUrl && (
            <div className="mt-3 max-w-sm">
              <Media src={notification.imageUrl} alt="" ratio="standard" radius="md" sizes="384px" />
            </div>
          )}
        </section>

        <section>
          <h2 className="text-label text-fg-subtle mb-2 uppercase"><AdminText>{"Record"}</AdminText></h2>
          <Fact label="Created" value={formatDate(new Date(notification.createdAt))} />
        </section>
      </div>
    </>
  );
}
