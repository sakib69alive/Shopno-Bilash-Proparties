"use client";

import { AdminText } from "@/components/admin/AdminLanguage";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Pencil, Trash2, Plus, Check, Archive } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { deleteNotification, markNotificationRead, archiveNotification } from "@/features/notifications/actions";
import type { Notification, NotificationChannel, NotificationEvent } from "@/types/notification";
import type { User } from "@/types/user";

export interface NotificationsAdminExplorerProps {
  notifications: Notification[];
  users: User[];
  canCreate: boolean;
  canDelete: boolean;
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

const READ_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
] as const;

/**
 * Search/filter over the real (currently empty) notification list from
 * `notificationRepository`, joined client-side to the users already
 * fetched by the page — no second user dataset.
 */
export function NotificationsAdminExplorer({ notifications, users, canCreate, canDelete }: NotificationsAdminExplorerProps) {
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<(typeof READ_OPTIONS)[number]["value"]>("all");
  const [isPending, startTransition] = useTransition();

  function handleDelete(notification: Notification) {
    if (!window.confirm(`Delete "${notification.title}"? This can't be undone.`)) return;
    startTransition(() => {
      deleteNotification(notification.id);
    });
  }

  function handleMarkRead(notification: Notification) {
    startTransition(() => {
      markNotificationRead(notification.id);
    });
  }

  function handleArchive(notification: Notification) {
    startTransition(() => {
      archiveNotification(notification.id);
    });
  }

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications
      .filter((n) => {
        const status = n.status ?? (n.readAt ? "read" : "unread");
        const isRead = status !== "unread";
        const matchesRead = readFilter === "all" || (readFilter === "read") === isRead;
        const matchesSearch =
          !query || n.title.toLowerCase().includes(query) || n.body.toLowerCase().includes(query);
        return matchesRead && matchesSearch;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, search, readFilter]);

  const columns: DataTableColumn<Notification>[] = [
    {
      key: "title",
      header: "Title",
      render: (n) => (
        <Link href={`/admin/notifications/${n.id}`} className="text-fg hover:text-accent transition-colors">
          {n.title}
        </Link>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      render: (n) => usersById.get(n.recipientUserId)?.name ?? "—",
    },
    { key: "event", header: "Event", render: (n) => EVENT_LABEL[n.event] },
    { key: "channel", header: "Channel", render: (n) => CHANNEL_LABEL[n.channel] },
    { key: "priority", header: "Priority", render: (n) => (n.priority ? <StatusBadge status={n.priority} /> : "—") },
    { key: "status", header: "Status", render: (n) => <StatusBadge status={n.status ?? (n.readAt ? "read" : "unread")} /> },
    { key: "createdAt", header: "Created", render: (n) => formatDate(new Date(n.createdAt)) },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (n) => (
        <span className="flex items-center justify-end gap-1">
          {(n.status ?? (n.readAt ? "read" : "unread")) === "unread" && (
            <IconButton icon={Check} label="Mark read" size="sm" disabled={isPending} onClick={() => handleMarkRead(n)} />
          )}
          {(n.status ?? "unread") !== "archived" && (
            <IconButton icon={Archive} label="Archive" size="sm" disabled={isPending} onClick={() => handleArchive(n)} />
          )}
          <Link href={`/admin/notifications/${n.id}/edit`}>
            <IconButton icon={Pencil} label={`Edit ${n.title}`} size="sm" />
          </Link>
          {canDelete && (
            <IconButton
              icon={Trash2}
              label={`Delete ${n.title}`}
              size="sm"
              disabled={isPending}
              onClick={() => handleDelete(n)}
              className="hover:text-error"
            />
          )}
        </span>
      ),
    },
  ];

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="No notifications yet"
        description="Notifications will appear here once the platform starts sending them."
        action={
          canCreate && (
            <Link href="/admin/notifications/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
              <Plus aria-hidden className="size-4" />
              <AdminText>{"New Notification"}</AdminText>
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search aria-hidden className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or message"
            aria-label="Search notifications"
            className="text-body-sm h-10 w-full rounded-md border border-border-strong bg-surface-raised pl-9 pr-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as (typeof READ_OPTIONS)[number]["value"])}
          aria-label="Filter by read status"
          className="text-body-sm h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        >
          {READ_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getRowId={(n) => n.id}
        emptyTitle="No notifications match your search"
        emptyDescription="Try a different title, message, or status filter."
      />
    </div>
  );
}
