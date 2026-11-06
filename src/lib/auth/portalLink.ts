import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { PORTAL_ROLES } from "@/config/roles";
import { getAuthSecret } from "@/lib/auth/session";
import { userRepository } from "@/features/users/repository";
import type { User } from "@/types/user";

/**
 * Personal "open without logging in" links for Customer / Shareholder /
 * Landowner accounts — built for clients who can't manage a phone number +
 * PIN screen, sent to them on WhatsApp.
 *
 * The link is `<path-prefix><userId>.<signature>`. The signature is an HMAC
 * of the user id and that user's current `portalLinkId`, keyed with
 * `AUTH_SECRET`, which gives three properties at once:
 *
 *   - The database alone can't rebuild a working link (the secret is not in it),
 *     so there's no table of live passwords to leak.
 *   - The admin can copy the very same link again any time (it's re-derived,
 *     not a one-time value that has to be stored somewhere readable).
 *   - Making a new `portalLinkId` kills the old link, and switching the link
 *     off (removing the id) kills it too — and `getCurrentUser` ties every
 *     device session to the id, so those devices are signed out as well.
 *
 * Nothing in the link mentions a domain: it's only the path. Whatever
 * domain the site ends up on, the admin copies the link from that domain.
 *
 * Staff accounts can never have one — `resolvePortalLinkToken` refuses any
 * role outside `PORTAL_ROLES`, so this can't be used to reach `/admin`.
 */
export const PORTAL_LINK_PATH_PREFIX = "/go/";

const SIGNATURE_LENGTH = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,100}\.[A-Za-z0-9_-]{32}$/;

function sign(userId: string, linkId: string): string {
  return createHmac("sha256", getAuthSecret())
    .update(`portal-link:v1:${userId}:${linkId}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function newPortalLinkId(): string {
  return randomBytes(12).toString("base64url");
}

/** The token part of a user's link, or `null` when they have no link switched on. */
export function buildPortalLinkToken(user: Pick<User, "id" | "portalLinkId">): string | null {
  if (!user.portalLinkId) return null;
  return `${user.id}.${sign(user.id, user.portalLinkId)}`;
}

export function buildPortalLinkPath(user: Pick<User, "id" | "portalLinkId">): string | null {
  const token = buildPortalLinkToken(user);
  return token ? `${PORTAL_LINK_PATH_PREFIX}${token}` : null;
}

export type PortalLinkResolution = { ok: true; user: User } | { ok: false; reason: "invalid" | "inactive" };

export async function resolvePortalLinkToken(token: string): Promise<PortalLinkResolution> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, reason: "invalid" };

  const dot = token.lastIndexOf(".");
  const userId = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const user = await userRepository.findById(userId);
  if (!user || !user.portalLinkId || !PORTAL_ROLES.includes(user.role)) return { ok: false, reason: "invalid" };

  const expected = Buffer.from(sign(user.id, user.portalLinkId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "invalid" };

  if (user.status === "suspended" || user.status === "disabled") return { ok: false, reason: "inactive" };

  return { ok: true, user };
}
