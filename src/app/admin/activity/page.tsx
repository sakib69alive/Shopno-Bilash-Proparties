import { AdminText } from "@/components/admin/AdminLanguage";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/feedback/PermissionDeniedState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { formatDateTime } from "@/lib/format";
import { describeAuditAction } from "@/lib/auditActions";
import { auditLogRepository } from "@/features/audit/repository";
import { userRepository } from "@/features/users/repository";
import { projectRepository } from "@/features/projects/repository";
import { filterToVisibleProjectsOptional } from "@/lib/projectScope";

const ACTIVITY_LIMIT = 200;

/**
 * Prompt 9 §6 — the friendly, project-aware Activity Feed, distinct from
 * the complete `/admin/audit` record (Part 7's own explicit "separate
 * these two" instruction). Reads the exact same append-only `AuditLog`
 * rows — this is a different presentation of one source of truth, not a
 * second write path, so nothing here can ever drift from what actually
 * happened.
 */
export default async function ActivityFeedPage() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "reports.view")) {
    return (
      <div className="p-4 sm:p-6">
        <PermissionDeniedState description="You don't have permission to view Activity." />
      </div>
    );
  }

  let entries, users, projects;
  try {
    const [allEntries, allUsers, allProjects] = await Promise.all([
      auditLogRepository.list(),
      userRepository.list(),
      projectRepository.list(),
    ]);
    entries = filterToVisibleProjectsOptional(user, allEntries)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, ACTIVITY_LIMIT);
    users = allUsers;
    projects = allProjects;
  } catch {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState description="Activity couldn't be loaded. Please try again." />
      </div>
    );
  }

  const usersById = new Map(users.map((u) => [u.id, u]));
  const projectsById = new Map(projects.map((p) => [p.id, p]));

  return (
    <>
      <AdminPageHeader title={<AdminText>{"Activity Feed"}</AdminText>} description={<AdminText>{"Who did what, when, and on which project — the last 200 events."}</AdminText>} />
      <div className="p-4 sm:p-6">
        {entries.length === 0 ? (
          <EmptyState title="No activity yet" description="Every important action across the system will appear here as it happens." />
        ) : (
          <ul className="border-border bg-surface-raised flex flex-col rounded-lg border">
            {entries.map((entry) => {
              const { label, Icon } = describeAuditAction(entry.action);
              const actor = usersById.get(entry.actorUserId);
              const project = entry.projectId ? projectsById.get(entry.projectId) : undefined;
              return (
                <li key={entry.id} className="border-border flex items-center gap-3 border-b p-3 last:border-b-0">
                  <span className="bg-surface text-fg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm text-fg">
                      {actor?.name ?? "Unknown user"} — {label}
                    </p>
                    <p className="text-caption text-fg-subtle">
                      {entry.entityType} {entry.entityId.slice(0, 8)}
                      {project ? ` · ${project.name}` : ""}
                    </p>
                  </div>
                  <p className="text-caption text-fg-subtle shrink-0">{formatDateTime(new Date(entry.occurredAt))}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
