"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { takeAttempt, clearAttempts } from "@/lib/auth/rateLimiter";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";
import { findOwnerCredentialsByPhone, createOwnerCredential, updateOwnerCredentialPin, normalizePhone } from "@/lib/auth/ownerCredentials";
import { findUserByPhone, userRepository } from "@/features/users/repository";
import { recordAuditEvent } from "@/features/audit/repository";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { PORTAL_ROLES, getPortalHomePath } from "@/config/roles";
import { getCurrentUser } from "@/lib/auth";

export interface OwnerAuthState {
  step: "phone" | "pin" | "activate";
  phone?: string;
  firstName?: string;
  error?: string;
}

const INACTIVE_MESSAGE = "Your portal access is currently unavailable. Please contact Shopno Bilash Properties Ltd.";
const NOT_FOUND_MESSAGE = "We couldn't find a portal account for this phone number. Please contact Shopno Bilash Properties Ltd.";
const GENERIC_PIN_ERROR = "Incorrect PIN. Please try again.";

// Timing parity for the PIN check, same reasoning as `lib/auth/actions.ts`'s
// `DUMMY_HASH_PROMISE` — so a valid phone number with a wrong PIN and an
// unrecognized phone number resolve in the same amount of time.
const DUMMY_PIN_HASH_PROMISE = hashPassword("0000");

async function getClientIp(): Promise<string | undefined> {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Step 1 — identifies which flow to show next (returning login vs.
 * first-time activation) without ever revealing account details before the
 * owner proves they hold the PIN. Unless `CompanySettings.requireOwnerPin`
 * is explicitly turned off — an admin-chosen tradeoff (see that field's own
 * comment): in that mode, a registered phone number alone is enough and
 * this signs the owner straight in here, skipping the PIN step entirely.
 * That relaxation is scoped to this one function/flow only — Staff/Admin
 * login (`lib/auth/actions.ts`) never reads this setting and always
 * requires a password.
 */
export async function identifyOwnerAction(_prevState: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const phone = String(formData.get("phone") ?? "").trim();

  if (!phone || normalizePhone(phone).length < 6) {
    return { step: "phone", error: "Enter a valid phone number." };
  }

  const rateLimitKey = normalizePhone(phone);

  // Throttles phone-number enumeration (this step reveals, via its two
  // different responses, whether a given number has a registered portal
  // account) — same limiter/key convention as the PIN step.
  if (!(await takeAttempt(rateLimitKey))) {
    return { step: "phone", error: "Too many attempts. Please try again in a few minutes." };
  }

  const user = await findUserByPhone(phone, PORTAL_ROLES);
  if (!user) {
    return { step: "phone", error: NOT_FOUND_MESSAGE };
  }
  if (user.status === "suspended" || user.status === "disabled") {
    return { step: "phone", error: INACTIVE_MESSAGE };
  }

  const settings = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  if (settings?.requireOwnerPin === false) {
    await clearAttempts(rateLimitKey);

    const token = await createSessionToken({ userId: user.id, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    await userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });

    await recordAuditEvent({
      actorUserId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id,
      ipAddress: await getClientIp(),
    });

    redirect(getPortalHomePath(user.role));
  }

  const existing = await findOwnerCredentialsByPhone(phone);
  const firstName = user.name.split(" ")[0];

  if (!existing) {
    return { step: "activate", phone: user.phone, firstName };
  }
  return { step: "pin", phone: user.phone, firstName };
}

/** Step 2a — first-time activation: owner sets their own 4-digit PIN. */
export async function activateOwnerPinAction(_prevState: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  // Activation was previously unthrottled: anyone could probe phone numbers (and claim any not-yet-activated account)
  // at full speed by calling this directly. It now shares the same limiter as sign-in.
  const activateKey = normalizePhone(phone);
  if (!(await takeAttempt(activateKey))) {
    return { step: "phone", error: "Too many attempts. Please try again in a few minutes." };
  }

  const user = await findUserByPhone(phone, PORTAL_ROLES);
  if (!user) return { step: "phone", error: NOT_FOUND_MESSAGE };
  if (user.status === "suspended" || user.status === "disabled") return { step: "phone", error: INACTIVE_MESSAGE };

  if (!isValidPin(pin)) return { step: "activate", phone, firstName: user.name.split(" ")[0], error: "PIN must be exactly 4 digits." };
  if (pin !== confirmPin) return { step: "activate", phone, firstName: user.name.split(" ")[0], error: "PINs don't match." };

  const existing = await findOwnerCredentialsByPhone(phone);
  if (existing) {
    // Already activated by a concurrent request — send them to the normal PIN flow instead of silently overwriting.
    return { step: "pin", phone, firstName: user.name.split(" ")[0] };
  }

  const pinHash = await hashPassword(pin);
  await createOwnerCredential(user.id, phone, pinHash);
  await clearAttempts(activateKey);

  if (user.status === "invited") {
    await userRepository.update(user.id, { status: "active", updatedAt: new Date().toISOString() });
  }

  const token = await createSessionToken({ userId: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.portal.activate",
    entityType: "User",
    entityId: user.id,
    ipAddress: await getClientIp(),
  });

  redirect(getPortalHomePath(user.role));
}

export interface ChangeOwnerPinState {
  error?: string;
  success?: boolean;
}

/** Profile → "Change PIN": requires the current PIN, not just a signed-in session, since a shared/unlocked phone shouldn't be enough on its own. */
export async function changeOwnerPinAction(_prevState: ChangeOwnerPinState, formData: FormData): Promise<ChangeOwnerPinState> {
  const currentPin = String(formData.get("currentPin") ?? "");
  const newPin = String(formData.get("newPin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  const user = await getCurrentUser();
  if (!user || !user.phone) return { error: "Your session has expired. Please sign in again." };

  const pinKey = normalizePhone(user.phone);
  if (!(await takeAttempt(pinKey))) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const credentials = await findOwnerCredentialsByPhone(user.phone);
  const pinValid = await verifyPassword(currentPin, credentials?.pinHash ?? (await DUMMY_PIN_HASH_PROMISE));
  if (!credentials || !pinValid) {
    return { error: "Current PIN is incorrect." };
  }

  if (!isValidPin(newPin)) return { error: "New PIN must be exactly 4 digits." };
  if (newPin !== confirmPin) return { error: "New PINs don't match." };

  await clearAttempts(pinKey);
  await updateOwnerCredentialPin(user.id, await hashPassword(newPin));

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.pin.change",
    entityType: "User",
    entityId: user.id,
    ipAddress: await getClientIp(),
  });

  return { success: true };
}

/** Step 2b — returning owner: verify the PIN they already set. */
export async function ownerPinLoginAction(_prevState: OwnerAuthState, formData: FormData): Promise<OwnerAuthState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "");
  // Rate-limit key must be the normalized number, not the raw input —
  // `findOwnerCredentialsByPhone` already normalizes before its lookup, so
  // "01712345678", "0171-234-5678" and "+8801712345678" all resolve to the
  // same account/PIN hash. Keying the limiter on the raw string let an
  // attacker reset their attempt count on every request just by varying
  // spacing/punctuation, making the 4-digit PIN brute-forceable.
  const rateLimitKey = normalizePhone(phone);

  if (!(await takeAttempt(rateLimitKey))) {
    return { step: "pin", phone, error: "Too many attempts. Please try again in a few minutes." };
  }

  const [credentials, user] = await Promise.all([findOwnerCredentialsByPhone(phone), findUserByPhone(phone, PORTAL_ROLES)]);
  const pinValid = await verifyPassword(pin, credentials?.pinHash ?? (await DUMMY_PIN_HASH_PROMISE));

  if (!credentials || !pinValid) {
    if (user) {
      await recordAuditEvent({
        actorUserId: user.id,
        action: "auth.login.failed",
        entityType: "User",
        entityId: user.id,
        ipAddress: await getClientIp(),
      });
    }
    return { step: "pin", phone, error: GENERIC_PIN_ERROR };
  }

  if (!user || user.status !== "active") {
    return { step: "phone", error: user ? INACTIVE_MESSAGE : NOT_FOUND_MESSAGE };
  }

  await clearAttempts(rateLimitKey);

  const token = await createSessionToken({ userId: user.id, role: user.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await userRepository.update(user.id, { lastLoginAt: new Date().toISOString() });

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ipAddress: await getClientIp(),
  });

  redirect(getPortalHomePath(user.role));
}

/** Dev-only shortcut, mirroring `lib/auth/actions.ts`'s `devSuperAdminLogin` — signs straight into the first active owner account so the portal can be reached without walking the phone+PIN flow during local testing. Never available in production. */
export async function devOwnerLogin(): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== "true") {
    throw new Error("devOwnerLogin is not enabled. Set NEXT_PUBLIC_ENABLE_DEV_LOGIN=true in .env.local to use it.");
  }

  const users = await userRepository.list();
  const owner = users.find((u) => PORTAL_ROLES.includes(u.role) && u.status === "active");
  if (!owner) {
    throw new Error("No active portal (owner) account found to sign in as.");
  }

  const token = await createSessionToken({ userId: owner.id, role: owner.role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

  await userRepository.update(owner.id, { lastLoginAt: new Date().toISOString() });

  await recordAuditEvent({
    actorUserId: owner.id,
    action: "auth.login",
    entityType: "User",
    entityId: owner.id,
    ipAddress: await getClientIp(),
  });

  redirect(getPortalHomePath(owner.role));
}
