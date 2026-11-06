import "server-only";
import { cookies } from "next/headers";
import type { User } from "@/types/user";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { userRepository } from "@/features/users/repository";

/**
 * Real session verification (Admin Step 3) — reads the signed, HttpOnly
 * session cookie, verifies its signature/expiry, then re-checks the
 * user's current status server-side (a disabled/removed account can't
 * keep using an otherwise-still-valid token). Every call site written
 * against the old always-`null` stub (Admin Step 1's `AdminLayout`/
 * `PortalLayout`, the three API routes) needed zero changes — this was
 * the whole point of keeping the signature `Promise<User | null>` stable.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const user = await userRepository.findById(session.sub);
  if (!user || user.status !== "active") return null;

  // A session that began from a personal link only lives as long as that
  // exact link does — a new link (or switching it off) signs the old
  // devices out.
  if (session.lk && user.portalLinkId !== session.lk) return null;

  return user;
}
