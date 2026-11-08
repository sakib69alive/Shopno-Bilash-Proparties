import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { wipeDemoData } from "@/lib/demoData";

const CONFIRM_PHRASE = "REMOVE ALL DATA";

/**
 * Removes the practice data (see `lib/demoData.ts`). The most destructive action in the panel, so: Super Admin only, and the request
 * must carry the exact phrase the UI makes the person type. The action is written to the audit log (which is itself kept).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (user.role !== "super_admin" || !hasPermission(user.role, "settings.manage")) {
    return NextResponse.json({ error: "Only a Super Admin can remove all data." }, { status: 403 });
  }

  let body: { confirm?: string; website?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }
  if (body.confirm !== CONFIRM_PHRASE) {
    return NextResponse.json({ error: "The confirmation phrase did not match, so nothing was removed." }, { status: 400 });
  }

  try {
    const result = await wipeDemoData({ website: body.website !== false });
    await recordAuditEvent({
      actorUserId: user.id,
      action: "system.demo-data.remove",
      entityType: "System",
      entityId: "demo-data",
      newValue: { website: body.website !== false, total: result.total },
    });
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Removing the data failed for an unknown reason.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
