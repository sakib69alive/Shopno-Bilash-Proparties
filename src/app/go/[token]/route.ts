import { NextResponse, type NextRequest } from "next/server";
import { resolvePortalLinkToken } from "@/lib/auth/portalLink";
import { createSessionToken, LONG_SESSION_COOKIE_OPTIONS, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getPortalHomePath } from "@/config/roles";
import { userRepository } from "@/features/users/repository";
import { recordAuditEvent } from "@/features/audit/repository";

/**
 * A client's personal link (`/go/<token>`, copied from the Admin panel and
 * sent on WhatsApp). Opening it signs that client straight into their own
 * portal — no phone number, no PIN — and keeps that device signed in for a
 * year, so the next visit needs nothing at all. See `lib/auth/portalLink.ts`
 * for how the link itself is built and revoked.
 *
 * Chat apps fetch a link the moment it's pasted, to draw the preview card.
 * Those requests get a plain preview page and nothing else: no session, no
 * "opened" count, and nothing about the account.
 */
export const dynamic = "force-dynamic";

const PREVIEW_BOT_PATTERN = /bot|crawler|spider|preview|whatsapp|facebookexternalhit|telegram|slack|discord|skype|twitter|linkedin|embedly|curl|wget|headless/i;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function previewPage(): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shopno Bilash Properties — Your Portal</title><meta name="robots" content="noindex,nofollow"><meta name="description" content="Open your Shopno Bilash Properties portal: your property, payments and construction updates."><meta property="og:title" content="Shopno Bilash Properties — Your Portal"><meta property="og:description" content="Tap to open your property, payments and construction updates."></head><body></body></html>`;
  return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE_HEADERS } });
}

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) response.headers.set(key, value);
  return response;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (PREVIEW_BOT_PATTERN.test(request.headers.get("user-agent") ?? "")) return previewPage();

  const resolution = await resolvePortalLinkToken(token);
  if (!resolution.ok) {
    return redirectTo(request, `/login?link=${resolution.reason}`);
  }

  const { user } = resolution;
  const now = new Date().toISOString();

  await userRepository.update(user.id, {
    // A client who has never used a PIN is "invited" until now — opening their own link is their activation.
    status: user.status === "invited" ? "active" : user.status,
    lastLoginAt: now,
    portalLinkLastUsedAt: now,
    portalLinkUseCount: (user.portalLinkUseCount ?? 0) + 1,
  });

  await recordAuditEvent({
    actorUserId: user.id,
    action: "auth.login.link",
    entityType: "User",
    entityId: user.id,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
  });

  const sessionToken = await createSessionToken({ userId: user.id, role: user.role, linkId: user.portalLinkId });
  const response = redirectTo(request, getPortalHomePath(user.role));
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, LONG_SESSION_COOKIE_OPTIONS);
  return response;
}
