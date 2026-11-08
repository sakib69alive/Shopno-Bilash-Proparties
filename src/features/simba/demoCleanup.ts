import "server-only";
import { prisma } from "@/lib/db";
import { DEMO_MARKER } from "./attention";

/**
 * Safety net for Simba's demo: removes every record the demo created (anything whose data carries the demo marker in its name or
 * title) and whatever hangs under those records (units, parking, sales, installments, payments, expenses… of a demo project or
 * customer). Real records are never matched: nothing is removed unless it carries the marker or belongs to something that does.
 */
const MODELS = [
  "project", "building", "floor", "unit", "parking", "customer", "constructionPhase", "constructionTask", "document", "customerPayment",
  "projectExpense", "projectBudget", "sale", "installment", "booking", "costAllocation", "purchase", "vendor", "material",
  "projectContent", "unitContent", "newsArticle", "galleryImage", "lead", "notification", "reminder",
] as const;

type Row = Record<string, unknown> & { id: string };
type Delegate = { findMany: () => Promise<{ id: string; data: unknown }[]>; deleteMany: (args: unknown) => unknown };

export async function removeDemoRecords(): Promise<{ removed: number }> {
  const client = prisma as unknown as Record<string, Delegate | undefined>;
  const all: Record<string, Row[]> = {};
  for (const m of MODELS) {
    const d = client[m];
    all[m] = d ? (await d.findMany()).map((r) => ({ ...(r.data as Record<string, unknown>), id: r.id })) : [];
  }
  const marked = (r: Row) => JSON.stringify(r).includes(DEMO_MARKER);
  const projectIds = new Set(all.project.filter(marked).map((r) => r.id));
  const customerIds = new Set(all.customer.filter(marked).map((r) => r.id));
  const unitIds = new Set(all.unit.filter((r) => marked(r) || projectIds.has(String(r.projectId))).map((r) => r.id));
  const saleIds = new Set(all.sale.filter((r) => marked(r) || projectIds.has(String(r.projectId)) || customerIds.has(String(r.customerId))).map((r) => r.id));

  const ops: unknown[] = [];
  let removed = 0;
  for (const m of MODELS) {
    const ids = all[m]
      .filter((r) => marked(r) || projectIds.has(String(r.projectId)) || customerIds.has(String(r.customerId)) || unitIds.has(String(r.unitId)) || saleIds.has(String(r.saleId)))
      .map((r) => r.id);
    if (ids.length === 0) continue;
    removed += ids.length;
    ops.push(client[m]!.deleteMany({ where: { id: { in: ids } } }));
  }
  if (ops.length > 0) await prisma.$transaction(ops as never[]);
  return { removed };
}
