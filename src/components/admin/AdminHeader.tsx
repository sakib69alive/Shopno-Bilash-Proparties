"use client";

import { Bell, LogOut } from "lucide-react";
import { SimbaLauncher } from "@/components/admin/SimbaLauncher";
import { IconButton } from "@/components/ui/IconButton";
import { GlobalSearch } from "@/components/admin/search/GlobalSearch";
import { ROLE_LABELS } from "@/config/roles";
import { logoutAction } from "@/lib/auth/actions";
import type { User } from "@/types/user";

export interface AdminHeaderProps {
  user: User;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Top bar, mounted once inside `AdminShell`. Prompt 10 — the global search
 * input is now the real, universal cross-domain search (`GlobalSearch`),
 * replacing the earlier disabled placeholder. The notification bell still
 * has no badge/dropdown — that's still genuinely unbuilt, not this step's
 * scope.
 *
 * `position: fixed`, not `sticky` — same reproducible compositor bug (and
 * same fix) as `AdminSidebar`, which this sits beside; `lg:left-64` keeps
 * it flush against that sidebar's own fixed width instead of overlapping
 * it. `AdminShell`'s `<main>` adds matching top padding since this no
 * longer occupies space in normal flow.
 */
export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-border bg-bg/95 fixed inset-x-0 top-0 z-30 hidden h-16 items-center gap-4 border-b px-4 backdrop-blur-sm print:hidden sm:px-6 lg:left-64 lg:flex">
      <GlobalSearch user={user} />

      <div className="ml-auto flex items-center gap-2">
        <SimbaLauncher />
        <IconButton icon={Bell} label="Notifications" />
        <div className="border-border ml-1 flex items-center gap-2.5 border-l pl-3">
          <span className="bg-accent text-accent-foreground text-label flex size-8 items-center justify-center rounded-full">
            {initials(user.name)}
          </span>
          <span className="hidden flex-col leading-tight md:flex">
            <span className="text-body-sm text-fg">{user.name}</span>
            <span className="text-caption text-fg-subtle">{ROLE_LABELS[user.role]}</span>
          </span>
          <form action={logoutAction}>
            <IconButton icon={LogOut} label="Sign out" type="submit" />
          </form>
        </div>
      </div>
    </header>
  );
}
