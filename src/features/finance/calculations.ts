import "server-only";
import { prisma } from "@/lib/db";
import type { CalculationInput } from "@/lib/financeCalculation";

export async function getFinanceCalculation(ownerId: string, id: string) {
  const row = await prisma.financeCalculation.findFirst({ where: { id, ownerId } });
  return row ? { ...row, data: row.data as unknown as CalculationInput } : null;
}
