import "server-only";
import { STAFF_ROLES } from "@/config/roles";
import { hasAllPermissions } from "@/lib/permissions";
import { getVisibleProjectIds } from "@/lib/projectScope";
import type { User } from "@/types/user";

// A single owner may have flats, documents and balances across several projects.
// Require portfolio-wide visibility before showing the combined owner view.
export function canInspectClientPortals(user: User | null) {
  return !!user && STAFF_ROLES.includes(user.role) && getVisibleProjectIds(user) === "all" &&
    hasAllPermissions(user.role, ["users.view", "finance.view", "documents.view"]);
}
