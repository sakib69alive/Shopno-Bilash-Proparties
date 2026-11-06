import { ADMIN_NAV_GROUPS } from "@/config/navigation";
import type { RoleName } from "@/config/roles";
import type { CompanySettings } from "@/types/settings";
import { AdminSidebarNav } from "./AdminSidebarNav";
import { Logo } from "@/components/navigation/Logo";

export interface AdminSidebarProps {
  role: RoleName;
  incompleteHrefs: string[];
  settings: CompanySettings | null;
}

/**
 * Persistent desktop sidebar (`lg` and up) — hidden entirely below that;
 * `AdminPhoneChrome` (top bar, tab capsule, menu sheet) covers narrower
 * viewports instead of this shrinking. No collapse-to-rail toggle — this stack's environment
 * has a reproducible compositor bug where toggling the sidebar width
 * leaves it visually stuck, and a full-width, always-labelled sidebar is
 * simpler and more reliable anyway (`AdminSidebarNav`'s `collapsed` mode
 * still exists for any future caller that wants it).
 *
 * `position: fixed`, not `sticky` — the same fix (and the same reason)
 * as the public site's `Header`: `sticky` on this element was visibly
 * unstable while the page scrolled (the same class of compositor bug as
 * the width-toggle one above), collapsing down to just its last child
 * instead of staying put as a whole. `fixed` sidesteps it completely by
 * taking the element out of normal layout entirely — `AdminShell`
 * compensates with `lg:pl-64` on the content column so nothing sits
 * underneath it.
 *
 * Three fixed regions, only the middle one scrolls: the logo header, the
 * scrollable nav groups, then "Help" pinned to the bottom always — it
 * used to be just the last group inside the same scrolling list, which
 * meant it scrolled out of view along with everything else instead of
 * staying reachable like a footer should.
 */
export function AdminSidebar({ role, incompleteHrefs, settings }: AdminSidebarProps) {
  const scrollableGroups = ADMIN_NAV_GROUPS.filter((group) => group.label !== "Help");
  const helpGroup = ADMIN_NAV_GROUPS.filter((group) => group.label === "Help");

  return (
    <aside className="border-border bg-surface fixed inset-y-0 left-0 z-30 hidden h-screen w-64 flex-col border-r print:hidden lg:flex">
      <div className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Logo
          href="/admin"
          src={settings?.logo}
          mode={settings?.logoMode}
          displayName={settings?.displayName}
          className="h-11 sm:h-11"
        />
        <span className="text-caption text-fg-subtle">Admin</span>
      </div>

      <div className="thin-scrollbar flex-1 overflow-y-auto px-3 py-4">
        <AdminSidebarNav groups={scrollableGroups} role={role} incompleteHrefs={incompleteHrefs} />
      </div>

      <div className="border-border shrink-0 border-t px-3 py-4">
        <AdminSidebarNav groups={helpGroup} role={role} incompleteHrefs={incompleteHrefs} />
      </div>
    </aside>
  );
}
