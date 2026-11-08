import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLES } from "@/config/roles";
import { hasPermission } from "@/lib/permissions";
import { removeDemoRecords } from "@/features/simba/demoCleanup";

/** Removes the records Simba's demo created (marked "Simba Demo") and nothing else. Used by the "Remove leftover demo records" button. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role) || !hasPermission(user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await removeDemoRecords();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
