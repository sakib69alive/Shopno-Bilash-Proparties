import { NextResponse } from "next/server";
import { STAFF_ROLES } from "@/config/roles";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceAssistantContext } from "@/features/finance/assistantContext";
import type { FinanceSelection } from "@/lib/financeAssistant";

const selectionKinds = new Set<string>(["expense", "member", "installment", "payment", "budget", "account", "goal"]);
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) return new NextResponse(null, { status: 403, headers });
  const query = new URL(request.url).searchParams;
  const path = query.get("path") ?? "";
  const project = query.get("project") || undefined;
  const draft = query.get("draft") || undefined;
  const kind = query.get("kind") ?? "";
  const id = query.get("id");
  if (path.length > 500 || [project, draft, id].some((value) => (value?.length ?? 0) > 200) || (id && !selectionKinds.has(kind))) {
    return new NextResponse(null, { status: 400, headers });
  }
  const selection = id ? { kind: kind as FinanceSelection["kind"], id } : undefined;
  const context = await getFinanceAssistantContext(user, path, project, selection, draft);
  if (!context) return new NextResponse(null, { status: 404, headers });
  return NextResponse.json(context, { headers });
}
