import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { STAFF_ROLES } from "@/config/roles";
import { canAccessProject } from "@/lib/projectScope";
import { getSimbaStatus } from "@/features/simba/status";
import { getSimbaAttention, getSimbaSampleIds } from "@/features/simba/attention";

/** Live setup status for Simba, the admin helper. Staff only; read-only. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!STAFF_ROLES.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const project = new URL(request.url).searchParams.get("project") ?? undefined;
  // A project this person is not assigned to is simply left out.
  const allowed = project && canAccessProject(user, project) ? project : undefined;
  const [status, attention, ids] = await Promise.all([getSimbaStatus(allowed), getSimbaAttention(), getSimbaSampleIds()]);
  return NextResponse.json({ ...status, attention, ids }, { headers: { "Cache-Control": "no-store" } });
}
