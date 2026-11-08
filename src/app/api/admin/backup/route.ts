import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildBackupZip } from "@/lib/backup";
import { recordAuditEvent } from "@/features/audit/repository";

/**
 * Admin API boundary — authenticated *and* permission-checked server-side,
 * same shape as every other `/api/admin/*` route. Gated on
 * `settings.manage` (not `content.view`/similar) since this can read every
 * record and every uploaded file in the system — the most sensitive single
 * capability in the admin panel.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode = modeParam === "data" ? "data" : "full";

  const zip = await buildBackupZip(mode);
  // Logged so Simba can tell when the last backup was taken.
  await recordAuditEvent({ actorUserId: user.id, action: "system.backup.download", entityType: "Backup", entityId: mode, newValue: { mode } });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `shopno-bilash-backup-${mode}-${timestamp}.zip`;

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.length),
    },
  });
}
