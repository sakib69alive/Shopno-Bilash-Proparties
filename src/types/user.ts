import type { AuditFields, ID } from "./common";
import type { RoleName } from "@/config/roles";

export type UserStatus = "active" | "invited" | "suspended" | "disabled";

export interface User extends AuditFields {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  role: RoleName;
  status: UserStatus;
  /** Set only for Customer/Shareholder/Landowner roles — links the account to its domain record. */
  linkedCustomerId?: ID;
  linkedShareholderId?: ID;
  linkedLandownerId?: ID;
  lastLoginAt?: string;
  /** The last time this person had the app open (refreshed at most every couple of minutes) — what the Clients page shows as "last seen". */
  lastSeenAt?: string;
  /**
   * Personal no-login link for Customer/Shareholder/Landowner accounts. This
   * is NOT the secret by itself — the link a client receives is
   * `<userId>.<HMAC(AUTH_SECRET, userId + this id)>` (see `lib/auth/portalLink.ts`),
   * so reading the database never lets anyone rebuild a working link. A new
   * random value here is what "make a new link" means; removing it turns the
   * link off.
   */
  portalLinkId?: string;
  portalLinkCreatedAt?: string;
  portalLinkLastUsedAt?: string;
  portalLinkUseCount?: number;
  /** The client's own pick for how floor plans look on their Home screen (Profile → Appearance). Unset = follow the company default in Settings. */
  portalLook?: "cream" | "blue" | "grid";
  /**
   * Projects this staff member can see — ignored for `super_admin`/
   * `managing_director`, who always see everything (see
   * `src/lib/projectScope.ts`). Undefined/empty for a brand-new staff
   * account means "sees nothing yet" in project-scoped modules, not
   * "sees everything" — an admin must explicitly assign at least one
   * project.
   */
  assignedProjectIds?: ID[];
}
