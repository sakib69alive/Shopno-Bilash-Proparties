"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { findCredentialsByEmail } from "@/lib/auth/credentials";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { takeAttempt, clearAttempts } from "@/lib/auth/rateLimiter";
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { findUserByEmail, userRepository } from "@/features/users/repository";
import { recordAuditEvent } from "@/features/audit/repository";
import { STAFF_ROLES, getPortalHomePath } from "@/config/roles";
import type { RoleName } from "@/config/roles";

export interface LoginState {
  error?: string;
}

// A real scrypt hash of a value nobody will ever type, run when the
// submitted email doesn't match any account — so `verifyPassword` always
// does the same expensive work either way. Without this, "wrong password"
// and "no such account" would resolve at measurably different speeds,
// letting an attacker enumerate valid emails one timing sample at a time.
const DUMMY_HASH_PROMISE = hashPassword("not-a-real-password-just-for-timing-parity");

function getRedirectPath(role: RoleName): string {
  if (STAFF_ROLES.includes(role)) return "/admin";
  return getPortalHomePath(role);
}

async function getClientIp(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

/**
 * Server Action backing `/login`'s form (Admin Step 3). Server Actions
 * get Next.js's built-in same-origin/CSRF protection for free (§21) —
 * no hand-rolled token needed. Deliberately one generic error message for
 * every failure branch (unknown email, wrong password, rate-limited,
 * disabled account) — brief §11 explicitly warns against letting error
 * text reveal which of those actually happened.
 */
export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }
  // Cap input length: an enormous "password" would just make the server burn time hashing it.
  if (email.length > 254 || password.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Invalid email or password." };
  }

  // Reserves an attempt BEFORE the (slow) password check, so a burst of parallel guesses can't all slip through.
  if (!(await takeAttempt(email))) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const credentials = await findCredentialsByEmail(email);
  const passwordValid = await verifyPassword(password, credentials?.passwordHash ?? (await DUMMY_HASH_PROMISE));

  if (!credentials || !passwordValid) {
    return { error: "Invalid email or password." };
  }

  const user = await findUserByEmail(email);
  if (!user || user.status !== "active") {
    return { error: "Invalid email or password." };
  }

  await clearAttempts(email);

  const token = await createSessionToken({ userId: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress: await getClientIp(),
  });

  redirect(getRedirectPath(user.role));
}

/**
 * Dev-only convenience so testing doesn't require retyping credentials on
 * every sign-in — skips password verification entirely and signs in as the
 * first active `super_admin` account. Off by default even in development:
 * requires both `NODE_ENV !== "production"` AND an explicit opt-in
 * (`NEXT_PUBLIC_ENABLE_DEV_LOGIN=true` in `.env.local`), so a misconfigured
 * `NODE_ENV` on some host is never the only thing standing between this
 * and a live site. Not just hidden from the UI (`LoginForm.tsx` checks the
 * same two conditions) but refused here too, since a hidden button is not
 * the same as the action being safe to call directly.
 */
export async function devSuperAdminLogin(): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== "true") {
    throw new Error("devSuperAdminLogin is not enabled. Set NEXT_PUBLIC_ENABLE_DEV_LOGIN=true in .env.local to use it.");
  }

  const users = await userRepository.list();
  const admin = users.find((u) => u.role === "super_admin" && u.status === "active");
  if (!admin) {
    throw new Error("No active super_admin account found to sign in as.");
  }

  const token = await createSessionToken({ userId: admin.id, role: admin.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await recordAuditEvent({
    actorUserId: admin.id,
    action: "auth.login",
    entityType: "User",
    entityId: admin.id,
    ipAddress: await getClientIp(),
  });

  redirect(getRedirectPath(admin.role));
}

/** Clears the session cookie server-side — a stale/replayed cookie value can't be reused, unlike merely hiding the Admin UI client-side. */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const session = await verifySessionToken(token);
    if (session) {
      await recordAuditEvent({
        actorUserId: session.sub,
        action: "auth.logout",
        entityType: "User",
        entityId: session.sub,
        ipAddress: await getClientIp(),
      });
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
