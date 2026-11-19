"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/features/audit/repository";
import { userRepository } from "@/features/users/repository";
import { ROLES, type RoleName } from "@/config/roles";
import type { UserStatus } from "@/types/user";

export interface UserFormState {
  error?: string;
}

const USER_STATUSES: UserStatus[] = ["active", "invited", "suspended", "disabled"];

/**
 * `users.manage` alone must NOT be enough to grant these two roles — both
 * sit above the rest of the role matrix (`managing_director` holds every
 * permission except `roles.manage`/`permissions.manage`; `super_admin`
 * holds those too). Without this, any `users.manage` holder (e.g. a
 * `managing_director`, who is deliberately excluded from `roles.manage`)
 * could edit their own account's role to `super_admin` and grant
 * themselves the apex permissions the system deliberately withholds from
 * them — a full privilege escalation. Assigning either apex role now
 * requires the actor to already hold `roles.manage` themselves.
 */
const APEX_ROLES: RoleName[] = ["super_admin", "managing_director"];

function isRoleName(value: string): value is RoleName {
  return (ROLES as readonly string[]).includes(value);
}
function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as string[]).includes(value);
}

async function requireUsersPermission() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "users.manage")) throw new Error("Forbidden");
  return user;
}

/** True if removing this user (or changing their role/status away from an active super_admin) would leave zero active super_admins. */
async function wouldRemoveLastActiveSuperAdmin(userId: string): Promise<boolean> {
  const all = await userRepository.list();
  const activeSuperAdmins = all.filter((u) => u.role === "super_admin" && u.status === "active");
  return activeSuperAdmins.length === 1 && activeSuperAdmins[0].id === userId;
}

function parseUserFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");
  const password = String(formData.get("password") ?? "");
  const assignedProjectIds = formData.getAll("assignedProjectIds").map(String);

  if (!name || name.length < 2) return { error: "Name must be at least 2 characters." } as const;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." } as const;
  if (!isRoleName(role)) return { error: "Choose a valid role." } as const;
  if (!isUserStatus(status)) return { error: "Choose a valid status." } as const;

  return { fields: { name, email, phone: phone || undefined, role, status, password, assignedProjectIds } } as const;
}

/** Prisma throws P2002 on a unique-constraint violation — here, `Credential.email` already in use. */
function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireUsersPermission();

  const parsed = parseUserFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  if (APEX_ROLES.includes(fields.role) && !hasPermission(actor.role, "roles.manage")) {
    return { error: "You don't have permission to grant that role." };
  }

  if (!fields.password || fields.password.length < 8) {
    return { error: "Set a password of at least 8 characters." };
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(fields.password);

  try {
    await prisma.credential.create({ data: { userId: id, email: fields.email, passwordHash } });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { error: "An account with that email already exists." };
    throw error;
  }

  await userRepository.create({
    id,
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    role: fields.role,
    status: fields.status,
    assignedProjectIds: fields.assignedProjectIds,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
  });

  await recordAuditEvent({ actorUserId: actor.id, action: "user.create", entityType: "User", entityId: id });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUser(id: string, _prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireUsersPermission();

  const parsed = parseUserFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await userRepository.findById(id);
  if (!existing) return { error: "This user no longer exists." };

  // An apex-role account (Super Admin / Managing Director) may only be touched — password,
  // email, status or role — by someone who already holds `roles.manage`, or by the account's
  // own holder. Without this, `users.manage` alone (which Managing Director has, but is
  // deliberately NOT given `roles.manage` — see APEX_ROLES above) would let that role silently
  // take over or demote a Super Admin by editing its credentials/role/status while never
  // tripping the role-escalation check below, which only looks at the *new* role requested.
  if (APEX_ROLES.includes(existing.role) && actor.id !== id && !hasPermission(actor.role, "roles.manage")) {
    return { error: "You don't have permission to modify a Super Admin or Managing Director account." };
  }

  if (APEX_ROLES.includes(fields.role) && existing.role !== fields.role && !hasPermission(actor.role, "roles.manage")) {
    return { error: "You don't have permission to grant that role." };
  }

  const demotingOrDeactivating = existing.role === "super_admin" && (fields.role !== "super_admin" || fields.status !== "active");
  if (demotingOrDeactivating && (await wouldRemoveLastActiveSuperAdmin(id))) {
    return { error: "This is the last active Super Admin — promote or activate another account first." };
  }

  if (fields.password) {
    if (fields.password.length < 8) return { error: "The new password must be at least 8 characters." };
    const passwordHash = await hashPassword(fields.password);
    await prisma.credential.update({ where: { userId: id }, data: { passwordHash, email: fields.email } });
  } else if (fields.email !== existing.email) {
    try {
      await prisma.credential.update({ where: { userId: id }, data: { email: fields.email } });
    } catch (error) {
      if (isUniqueConstraintError(error)) return { error: "An account with that email already exists." };
      throw error;
    }
  }

  const updated = await userRepository.update(id, {
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    role: fields.role,
    status: fields.status,
    assignedProjectIds: fields.assignedProjectIds,
    updatedBy: actor.id,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "This user no longer exists." };

  await recordAuditEvent({ actorUserId: actor.id, action: "user.update", entityType: "User", entityId: id });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}`);
  redirect(`/admin/users/${id}`);
}

export async function deleteUser(id: string): Promise<void> {
  const actor = await requireUsersPermission();

  if (actor.id === id) return; // Can't delete your own account while signed in as it.

  const existing = await userRepository.findById(id);
  if (!existing) return;

  // Same silent-guard convention as the self-delete check above — refuse
  // to delete the last active Super Admin, which would otherwise strip
  // `roles.manage`/`permissions.manage` from the entire system with no
  // recovery path in the UI.
  if (existing.role === "super_admin" && (await wouldRemoveLastActiveSuperAdmin(id))) return;

  await userRepository.remove(id);
  await prisma.credential.delete({ where: { userId: id } }).catch(() => {});

  await recordAuditEvent({ actorUserId: actor.id, action: "user.delete", entityType: "User", entityId: id });

  revalidatePath("/admin/users");
}
