import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Authenticated-portal API boundary — every handler under /api/portal/*
 * must resolve the caller server-side and return 401 if there isn't one.
 * The frontend hiding a link is never sufficient (ARCHITECTURE.md §11).
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // The personal-link fields are account-management data, not something the portal client needs back.
  const { portalLinkId: _id, portalLinkCreatedAt: _created, portalLinkLastUsedAt: _used, portalLinkUseCount: _count, ...safeUser } = user;
  void [_id, _created, _used, _count];
  return NextResponse.json({ user: safeUser });
}
