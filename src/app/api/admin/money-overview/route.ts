import { NextResponse } from "next/server";
import { getMoneyOverview } from "@/features/finance/moneyOverview";
import { saleRepository } from "@/features/sales/repository";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { canAccessProject } from "@/lib/projectScope";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) {
    return new NextResponse(null, { status: 403, headers });
  }

  const projectId = new URL(request.url).searchParams.get("project") || undefined;
  if (projectId && !canAccessProject(user, projectId)) {
    return new NextResponse(null, { status: 403, headers });
  }

  const sales = await saleRepository.list();
  const overview = await getMoneyOverview(user, sales, projectId);
  return NextResponse.json(overview, { headers });
}
