"use client";

// Stays a Client Component on purpose: `AdminSidebar` hands the nav config (which carries icon
// components) straight to `AdminSidebarNav`, and that only works when both sit on the client side.
import type { ReactNode } from "react";
import type { User } from "@/types/user";
import type { CompanySettings } from "@/types/settings";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminPhoneChrome } from "./AdminPhoneChrome";
import { SimbaAgent } from "./simba/SimbaAgent";

export interface AdminShellProps {
  user: User;
  children: ReactNode;
  /** Hrefs of nav items missing data worth flagging — see `src/lib/adminCompleteness.ts`. */
  incompleteHrefs: string[];
  settings: CompanySettings | null;
}

/**
 * AdminShell = Sidebar + Header + main content area (brief §4). Mounted
 * only inside `src/app/admin/layout.tsx`, after that layout's own
 * auth/staff-role gate — this component assumes `user` is real and never
 * re-checks permissions itself beyond what `AdminSidebar`'s nav filtering
 * already does. Deliberately not the public site's cinematic
 * `PageTransition`/`SitePageLoader` (brief §22) — plain instant
 * route swaps, since admin users prioritize speed over ceremony.
 *
 * From `lg` up: fixed sidebar + fixed header. Below `lg` (phones and
 * tablets) both are hidden and `AdminPhoneChrome` takes over — a slim top
 * bar, a floating bottom tab capsule and a Menu sheet. Both desktop pieces
 * are `position: fixed` (see their own comments for why), so neither
 * occupies space in this flex row — the content column gets `lg:pl-64` for
 * the sidebar and `<main>` gets top padding for whichever bar is showing,
 * plus bottom padding on phones so the tab capsule never covers content.
 */
export function AdminShell({ user, children, incompleteHrefs, settings }: AdminShellProps) {
  return (
    <div data-admin-shell className="bg-bg flex min-h-screen">
      <AdminSidebar role={user.role} incompleteHrefs={incompleteHrefs} settings={settings} />
      <AdminPhoneChrome user={user} incompleteHrefs={incompleteHrefs} settings={settings} />

      <div className="min-w-0 flex-1 print:pl-0 lg:pl-64">
        <AdminHeader user={user} />
        <main className="min-w-0 pt-[calc(4.25rem+env(safe-area-inset-top))] pb-[calc(6.5rem+env(safe-area-inset-bottom))] print:pt-0 print:pb-0 lg:pt-16 lg:pb-0">
          {children}
        </main>
      </div>
      <SimbaAgent role={user.role} />
    </div>
  );
}
