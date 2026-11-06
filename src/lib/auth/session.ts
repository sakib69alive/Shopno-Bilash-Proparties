import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { RoleName } from "@/config/roles";
import type { ID } from "@/types/common";

export const SESSION_COOKIE_NAME = "sbp_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Sessions started from a client's personal link (`/go/<token>`) stay signed in for a year — those clients are not expected to ever type a password or PIN. */
export const LONG_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 365;

export interface SessionPayload extends JWTPayload {
  sub: ID;
  role: RoleName;
  /**
   * Only on sessions that began from a personal link: the link generation
   * this session belongs to. `getCurrentUser` rejects the session the moment
   * the user's current link no longer matches, so making a new link (or
   * switching the link off) signs that client's old devices out.
   */
  lk?: string;
}

/**
 * Signed, stateless session tokens via `jose` — chosen specifically because
 * it works identically in the Node runtime (Server Actions, route
 * handlers) and the Edge runtime (`middleware.ts`), unlike Node's built-in
 * `crypto` (used for password hashing instead, which never needs to run in
 * middleware). The token carries only `sub` (user id) and `role` — never a
 * name/email/anything that shouldn't survive a role change until the
 * session is refreshed, and never the password hash.
 *
 * `AUTH_SECRET` has no fallback value on purpose (see the thrown error
 * below) — a hardcoded fallback would itself be a secret committed to
 * source, which is exactly what this file must never do.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is not set (or is shorter than 32 characters). Set it in .env.local — see .env.example.",
    );
  }
  return secret;
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createSessionToken(payload: {
  userId: ID;
  role: RoleName;
  /** Personal-link sessions only — see `SessionPayload.lk`. Also switches the session to the long duration. */
  linkId?: string;
}): Promise<string> {
  const duration = payload.linkId ? LONG_SESSION_DURATION_SECONDS : SESSION_DURATION_SECONDS;
  return new SignJWT({ role: payload.role, ...(payload.linkId ? { lk: payload.linkId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${duration}s`)
    .sign(getSecretKey());
}

/** Returns `null` on any verification failure (expired, tampered, malformed) — callers never need to distinguish why. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (!payload.sub || typeof payload.role !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};

/** Cookie options for a personal-link session — same flags as above, just a year instead of a week. */
export const LONG_SESSION_COOKIE_OPTIONS = {
  ...SESSION_COOKIE_OPTIONS,
  maxAge: LONG_SESSION_DURATION_SECONDS,
};
