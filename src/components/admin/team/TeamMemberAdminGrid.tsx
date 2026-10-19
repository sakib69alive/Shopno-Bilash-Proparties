"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Media } from "@/components/ui/Media";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { buttonVariants } from "@/components/ui/Button";
import { deleteTeamMember } from "@/features/teamMembers/actions";
import type { TeamMember } from "@/types/teamMember";
import { cn } from "@/lib/utils";

export interface TeamMemberAdminGridProps {
  members: TeamMember[];
  canDelete: boolean;
}

/** A photo grid, not a data table — these cards are shown nearly as-is on the public team section, so the admin list should look like it. */
export function TeamMemberAdminGrid({ members, canDelete }: TeamMemberAdminGridProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete(member: TeamMember) {
    if (!window.confirm(`Remove "${member.name}" from the team grid? This can't be undone.`)) return;
    startTransition(() => {
      deleteTeamMember(member.id);
    });
  }

  if (members.length === 0) {
    return (
      <EmptyState
        title="No partners or team members yet"
        description="Add the first entry to show it alongside the Founder on the public Founder page."
        action={
          <Link href="/admin/content/team/new" className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-2")}>
            New Team Member
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {members.map((member) => (
        <div key={member.id} className="group border-border bg-surface-raised overflow-hidden rounded-lg border">
          <Media ratio="portrait" src={member.photo || "/placeholder-image.png"} alt={member.name} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" />
          <div className="flex items-start justify-between gap-2 p-3">
            <div className="min-w-0">
              <p className="text-body-sm text-fg truncate font-medium">{member.name}</p>
              <p className="text-caption text-fg-subtle truncate">{member.title}</p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Link href={`/admin/content/team/${member.id}/edit`}>
                <IconButton icon={Pencil} label={`Edit ${member.name}`} size="sm" />
              </Link>
              {canDelete && (
                <IconButton
                  icon={Trash2}
                  label={`Remove ${member.name}`}
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(member)}
                  className="hover:text-error"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
