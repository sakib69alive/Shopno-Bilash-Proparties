"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { userRepository } from "@/features/users/repository";
import { deleteOwnerCredential } from "@/lib/auth/ownerCredentials";
import { buildPortalLinkPath, newPortalLinkId } from "@/lib/auth/portalLink";
import { customerRepository } from "@/features/customers/repository";
import { shareholderRepository } from "@/features/shareholders/repository";
import { landownerRepository } from "@/features/landowners/repository";
import type { OwnerType } from "@/types/finance/costAllocation";
import type { ID } from "@/types/common";
import type { User } from "@/types/user";

async function requireUsersManagePermission() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "users.manage")) throw new Error("Forbidden");
  return user;
}

/**
 * Chapter 3 — the admin-side half of "grant portal access." Reuses the
 * existing Customer/Shareholder/Landowner record as the source of truth
 * for name/email/phone (never invents a synthetic one) and links the two
 * records both ways (`User.linkedXId` and `<Owner>.userId`), the same
 * relationship `types/customer.ts` already documented as designed-for.
 * Does NOT create an `OwnerCredential` row — that only ever happens when
 * the owner themselves completes first-time PIN activation
 * (`lib/auth/ownerActions.ts`), so a granted-but-never-logged-in account
 * correctly reads as "Pending Activation".
 */
export async function grantPortalAccess(ownerType: OwnerType, ownerId: ID): Promise<{ error?: string; userId?: string }> {
  const admin = await requireUsersManagePermission();

  const repo = ownerType === "customer" ? customerRepository : ownerType === "shareholder" ? shareholderRepository : landownerRepository;
  const owner = await repo.findById(ownerId);
  if (!owner) return { error: "This record no longer exists." };
  if (owner.userId) return { userId: owner.userId };

  if (!owner.email) return { error: "This record has no email on file — add one before granting portal access." };
  if (!owner.phone) return { error: "This record has no phone number on file — add one before granting portal access." };

  const existingByEmail = (await userRepository.list()).find((u) => u.email.toLowerCase() === owner.email.toLowerCase());
  if (existingByEmail) return { error: "A user account with this email already exists." };

  const id = randomUUID();
  const now = new Date().toISOString();
  const linkField: Partial<User> =
    ownerType === "customer"
      ? { linkedCustomerId: ownerId }
      : ownerType === "shareholder"
        ? { linkedShareholderId: ownerId }
        : { linkedLandownerId: ownerId };

  await userRepository.create({
    id,
    name: owner.name,
    email: owner.email,
    phone: owner.phone,
    role: ownerType,
    status: "invited",
    ...linkField,
    createdAt: now,
    updatedAt: now,
    createdBy: admin.id,
  });

  await repo.update(ownerId, { userId: id, updatedBy: admin.id, updatedAt: now });

  await recordAuditEvent({ actorUserId: admin.id, action: "portal.access.grant", entityType: "User", entityId: id });

  revalidatePath(`/admin/${ownerType === "customer" ? "customers" : ownerType === "shareholder" ? "shareholders" : "landowners"}/${ownerId}`);
  revalidatePath("/admin/users");
  return { userId: id };
}

/**
 * Admin-assisted PIN reset (Prompt 1 §"Admin should NOT be able to view
 * the owner's existing PIN"). Deletes the `OwnerCredential` row outright —
 * there is no "old PIN" to invalidate-in-place, only a fresh activation
 * to require. Always recorded in the Audit Log (Chapter 2's own, not a
 * separate portal log) with the admin as actor and the reason, if given.
 */
export async function resetOwnerPortalAccess(userId: ID, reason?: string): Promise<{ error?: string }> {
  const admin = await requireUsersManagePermission();

  const owner = await userRepository.findById(userId);
  if (!owner) return { error: "This user no longer exists." };

  await deleteOwnerCredential(userId);

  const now = new Date().toISOString();
  // Not for someone who signs in through their personal link: that needs the account to stay active, and the link isn't what's being reset here.
  if (owner.status === "active" && !owner.portalLinkId) {
    await userRepository.update(userId, { status: "invited", updatedBy: admin.id, updatedAt: now });
  }

  await recordAuditEvent({
    actorUserId: admin.id,
    action: "portal.access.reset",
    entityType: "User",
    entityId: userId,
    newValue: reason ? { reason } : undefined,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Personal no-login links (see `lib/auth/portalLink.ts`)
// ---------------------------------------------------------------------------

export interface PortalLinkInfo {
  /** Path only (`/go/...`) — the browser adds whatever domain the admin is on right now, so a future domain change needs no fix-up. */
  path: string;
  phone?: string;
  name: string;
  createdAt?: string;
  lastUsedAt?: string;
  useCount: number;
}

export interface PortalLinkResult {
  error?: string;
  link?: PortalLinkInfo;
}

function ownerRepoFor(ownerType: OwnerType) {
  return ownerType === "customer" ? customerRepository : ownerType === "shareholder" ? shareholderRepository : landownerRepository;
}

function ownerAdminPath(ownerType: OwnerType, ownerId: ID): string {
  return `/admin/${ownerType === "customer" ? "customers" : ownerType === "shareholder" ? "shareholders" : "landowners"}/${ownerId}`;
}

/**
 * Finds the portal account behind a Customer/Shareholder/Landowner record,
 * creating it on the spot when there isn't one yet — the whole point of the
 * link is that the admin never has to visit a "grant access" step first.
 * Unlike `grantPortalAccess`, an email is NOT required: older clients often
 * have none, and the link doesn't need one, so a reserved-for-testing
 * `.invalid` address stands in (it can never receive mail or collide with a
 * real one).
 */
async function ensureOwnerUser(ownerType: OwnerType, ownerId: ID, adminId: ID): Promise<{ error: string } | { user: User }> {
  const repo = ownerRepoFor(ownerType);
  const owner = await repo.findById(ownerId);
  if (!owner) return { error: "This record no longer exists." };

  if (owner.userId) {
    const existing = await userRepository.findById(owner.userId);
    if (existing) return { user: existing };
  }

  const email = owner.email?.trim() || `no-email-${ownerId}@portal.invalid`;
  const emailTaken = (await userRepository.list()).some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (emailTaken) return { error: "A user account with this email already exists. Open it under Users instead." };

  const id = randomUUID();
  const now = new Date().toISOString();
  const linkField: Partial<User> =
    ownerType === "customer"
      ? { linkedCustomerId: ownerId }
      : ownerType === "shareholder"
        ? { linkedShareholderId: ownerId }
        : { linkedLandownerId: ownerId };

  const user: User = {
    id,
    name: owner.name,
    email,
    phone: owner.phone || undefined,
    role: ownerType,
    status: "invited",
    ...linkField,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };
  await userRepository.create(user);
  await repo.update(ownerId, { userId: id, updatedBy: adminId, updatedAt: now });
  await recordAuditEvent({ actorUserId: adminId, action: "portal.access.grant", entityType: "User", entityId: id });

  return { user };
}

function linkInfoFor(user: User): PortalLinkInfo | undefined {
  const path = buildPortalLinkPath(user);
  if (!path) return undefined;
  return {
    path,
    phone: user.phone,
    name: user.name,
    createdAt: user.portalLinkCreatedAt,
    lastUsedAt: user.portalLinkLastUsedAt,
    useCount: user.portalLinkUseCount ?? 0,
  };
}

function revalidateOwnerPages(ownerType: OwnerType, ownerId: ID) {
  revalidatePath(ownerAdminPath(ownerType, ownerId));
  revalidatePath("/admin/users");
}

/** "Copy link" — returns this client's link, switching it on (and creating their portal account) the first time. The same link comes back every time after that. */
export async function getPortalLink(ownerType: OwnerType, ownerId: ID): Promise<PortalLinkResult> {
  const admin = await requireUsersManagePermission();

  const ensured = await ensureOwnerUser(ownerType, ownerId, admin.id);
  if ("error" in ensured) return { error: ensured.error };
  let { user } = ensured;

  if (user.status === "suspended" || user.status === "disabled") {
    return { error: "This client's portal access is switched off. Re-enable the account under Users first." };
  }

  if (!user.portalLinkId) {
    const now = new Date().toISOString();
    const updated = await userRepository.update(user.id, {
      portalLinkId: newPortalLinkId(),
      portalLinkCreatedAt: now,
      portalLinkLastUsedAt: undefined,
      portalLinkUseCount: 0,
      updatedBy: admin.id,
      updatedAt: now,
    });
    user = updated ?? user;
    await recordAuditEvent({ actorUserId: admin.id, action: "portal.link.create", entityType: "User", entityId: user.id });
    revalidateOwnerPages(ownerType, ownerId);
  }

  const link = linkInfoFor(user);
  return link ? { link } : { error: "The link couldn't be created. Please try again." };
}

/** "Make a new link" — the old link stops working and every device signed in through it is signed out. For when a link was sent to the wrong person or a phone was lost. */
export async function regeneratePortalLink(ownerType: OwnerType, ownerId: ID): Promise<PortalLinkResult> {
  const admin = await requireUsersManagePermission();

  const ensured = await ensureOwnerUser(ownerType, ownerId, admin.id);
  if ("error" in ensured) return { error: ensured.error };
  const { user } = ensured;

  if (user.status === "suspended" || user.status === "disabled") {
    return { error: "This client's portal access is switched off. Re-enable the account under Users first." };
  }

  const now = new Date().toISOString();
  const updated = await userRepository.update(user.id, {
    portalLinkId: newPortalLinkId(),
    portalLinkCreatedAt: now,
    portalLinkLastUsedAt: undefined,
    portalLinkUseCount: 0,
    updatedBy: admin.id,
    updatedAt: now,
  });
  await recordAuditEvent({ actorUserId: admin.id, action: "portal.link.regenerate", entityType: "User", entityId: user.id });
  revalidateOwnerPages(ownerType, ownerId);

  const link = updated ? linkInfoFor(updated) : undefined;
  return link ? { link } : { error: "The link couldn't be created. Please try again." };
}

/** "Turn link off" — the link and all devices signed in through it stop working. The client can still use phone + PIN if they have one. */
export async function revokePortalLink(ownerType: OwnerType, ownerId: ID): Promise<{ error?: string }> {
  const admin = await requireUsersManagePermission();

  const owner = await ownerRepoFor(ownerType).findById(ownerId);
  if (!owner?.userId) return {};
  const user = await userRepository.findById(owner.userId);
  if (!user?.portalLinkId) return {};

  await userRepository.update(user.id, {
    portalLinkId: undefined,
    portalLinkCreatedAt: undefined,
    portalLinkLastUsedAt: undefined,
    portalLinkUseCount: undefined,
    updatedBy: admin.id,
    updatedAt: new Date().toISOString(),
  });
  await recordAuditEvent({ actorUserId: admin.id, action: "portal.link.revoke", entityType: "User", entityId: user.id });
  revalidateOwnerPages(ownerType, ownerId);
  return {};
}
