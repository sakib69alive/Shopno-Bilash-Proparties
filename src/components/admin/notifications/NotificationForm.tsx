"use client";

import { PersistForm } from "@/components/ui/PersistForm";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import type { Notification, NotificationChannel, NotificationEvent, NotificationCategory, NotificationPriority } from "@/types/notification";
import type { User } from "@/types/user";
import type { Project } from "@/types/project";
import type { NotificationFormState } from "@/features/notifications/actions";

export interface NotificationFormProps {
  action: (state: NotificationFormState, formData: FormData) => Promise<NotificationFormState>;
  notification?: Notification;
  users: User[];
  projects: Project[];
  submitLabel: string;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}

const EVENT_OPTIONS: { value: NotificationEvent; label: string }[] = [
  { value: "payment.received", label: "Payment Received" },
  { value: "payment.due", label: "Payment Due" },
  { value: "payment.overdue", label: "Payment Overdue" },
  { value: "booking.confirmed", label: "Booking Confirmed" },
  { value: "document.uploaded", label: "Document Uploaded" },
  { value: "construction.milestone-reached", label: "Construction Milestone Reached" },
  { value: "project.updated", label: "Project Updated" },
  { value: "lead.new-inquiry", label: "New Lead Enquiry" },
  { value: "lead.follow-up-reminder", label: "Lead Follow-up Reminder" },
  { value: "approval.requested", label: "Approval Requested" },
];

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: "in-app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
];

const CATEGORY_OPTIONS: { value: NotificationCategory; label: string }[] = [
  { value: "finance", label: "Finance" },
  { value: "construction", label: "Construction" },
  { value: "sales", label: "Sales" },
  { value: "crm", label: "CRM" },
  { value: "document", label: "Document" },
  { value: "inventory", label: "Inventory" },
  { value: "system", label: "System" },
  { value: "security", label: "Security" },
  { value: "approval", label: "Approval" },
  { value: "reminder", label: "Reminder" },
];

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const SEND_MODE_OPTIONS = [
  { value: "one", label: "One Person" },
  { value: "all", label: "Every Owner In A Project" },
];

/** Records the notification itself — no email/SMS/WhatsApp provider is wired up yet (`NotificationProvider` in `types/notification.ts` is the future dispatch interface), so this creates the record only, same honesty as every other domain here. */
export function NotificationForm({ action, notification, users, projects, submitLabel }: NotificationFormProps) {
  const [state, formAction] = useActionState(action, {});
  // Broadcasting to every owner in a project only makes sense when creating a fresh announcement — editing always targets the one existing record.
  const [sendMode, setSendMode] = useState<"one" | "all">("one");
  const isBroadcast = !notification && sendMode === "all";

  return (
    <PersistForm state={state} action={formAction} className="flex max-w-2xl flex-col gap-5">
      {state.error && (
        <div role="alert" className="bg-error-soft text-error flex items-start gap-2.5 rounded-md px-3.5 py-3">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-sm">{state.error}</p>
        </div>
      )}

      {!notification && (
        <Select
          label="Send To"
          name="sendMode"
          value={sendMode}
          onChange={(e) => setSendMode(e.target.value === "all" ? "all" : "one")}
          options={SEND_MODE_OPTIONS}
        />
      )}

      {isBroadcast ? (
        <Select
          label="Project"
          name="projectId"
          required
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          placeholder="Choose a project"
          helperText="Sent to every unit owner (customer, shareholder, landowner) in this project who has an active portal account."
        />
      ) : (
        <Select
          label="Recipient"
          name="recipientUserId"
          required
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={notification?.recipientUserId}
          placeholder={users.length > 0 ? "Choose a user" : "No users yet"}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select label="Event" name="event" required options={EVENT_OPTIONS} defaultValue={notification?.event} placeholder="Choose an event" />
        <Select label="Channel" name="channel" required options={CHANNEL_OPTIONS} defaultValue={notification?.channel} placeholder="Choose a channel" />
      </div>

      <Input label="Title" name="title" required defaultValue={notification?.title} placeholder="e.g. Payment received" />
      <Textarea label="Message" name="body" required rows={4} defaultValue={notification?.body} placeholder="The full notification message." />

      <Input
        label={notification?.imageUrl ? "Replace Image (optional)" : "Image (optional)"}
        name="image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        helperText={
          notification?.imageUrl
            ? `Currently: ${notification.imageUrl.split("/").pop()} — leave empty to keep it.`
            : "JPG, PNG or WEBP, up to 15MB — attach a photo alongside the message."
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Category (optional)"
          name="category"
          options={CATEGORY_OPTIONS}
          defaultValue={notification?.category}
          placeholder="Not categorized"
        />
        <Select
          label="Priority (optional)"
          name="priority"
          options={PRIORITY_OPTIONS}
          defaultValue={notification?.priority ?? "medium"}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {!isBroadcast && (
          <Select
            label="Project (optional)"
            name="projectId"
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            defaultValue={notification?.projectId}
            placeholder="Not tied to a project"
          />
        )}
        <Input label="Related Record ID (optional)" name="relatedEntityId" defaultValue={notification?.relatedEntityId} />
      </div>

      <Input
        label="Action Link (optional)"
        name="actionHref"
        defaultValue={notification?.actionHref}
        placeholder="e.g. /admin/finance/expenses/123"
        helperText="Clicking the notification takes the recipient here."
      />

      <div className="flex items-center gap-3">
        <SubmitButton label={isBroadcast ? "Send to All Owners" : submitLabel} />
      </div>
    </PersistForm>
  );
}
