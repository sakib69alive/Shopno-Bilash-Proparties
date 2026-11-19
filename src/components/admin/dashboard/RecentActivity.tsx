import { AdminText } from "../AdminLanguage";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDate } from "@/lib/format";
import { describeAuditAction } from "@/lib/auditActions";
import type { AuditLog } from "@/types/audit-log";

export interface RecentActivityProps {
  activity: AuditLog[];
}

/**
 * Reads straight from the append-only audit log (Admin Step 3) — every
 * row here is a real event that actually happened (a login, a News
 * article change), never a generated sample. As more modules gain
 * mutations (Project create, Payment recorded, …), they show up here for
 * free the moment they call `recordAuditEvent`.
 */
export function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Activity will appear here as your team starts managing projects, properties and business operations."
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {activity.map((entry) => {
        const { label, Icon } = describeAuditAction(entry.action);
        return (
          <li key={entry.id} className="border-border flex items-center gap-3 border-b py-3 last:border-b-0">
            <span className="bg-surface text-fg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Icon aria-hidden className="size-4" />
            </span>
            <span className="text-body-sm flex-1 text-fg"><AdminText>{label}</AdminText></span>
            <span className="text-caption text-fg-subtle shrink-0">{formatDate(new Date(entry.occurredAt))}</span>
          </li>
        );
      })}
    </ul>
  );
}
