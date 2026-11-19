"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { calculateFinanceDraft, MAX_CALCULATION_LINES, type CalculationInput } from "@/lib/financeCalculation";

export async function saveFinanceCalculation(
  id: string | null,
  revision: number,
  _state: { error?: string },
  form: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user.role, "finance.view")) return { error: "You don't have access to save calculations." };
  const name = String(form.get("name") ?? "").trim();
  const mode = form.get("mode");
  const pool = String(form.get("pool") ?? "").trim();
  const descriptions = form.getAll("description");
  const amounts = form.getAll("amount");
  const quantities = form.getAll("quantity");
  const ratios = form.getAll("ratio");
  if (!name || name.length > 100 || (mode !== "items" && mode !== "split")) return { error: "Enter a title and choose a calculation type." };
  if (descriptions.length > MAX_CALCULATION_LINES) return { error: "A calculation can contain up to 50 rows." };
  const lines = descriptions.map((description, index) => ({
    description: String(description).trim(),
    amount: mode === "items" ? String(amounts[index] ?? "").trim() : "0",
    quantity: mode === "items" ? String(quantities[index] ?? "").trim() : "1",
    ratio: mode === "split" ? String(ratios[index] ?? "").trim() : "1",
  }));
  const data: CalculationInput = { name, mode, pool: mode === "split" ? pool : "0", lines };
  if (lines.some((line) => line.description.length > 150) || !calculateFinanceDraft(data)) {
    return { error: "Check the row amounts and quantities, or enter ratios with at least one positive share." };
  }

  const existingId = form.get("saveAsCopy") === "true" ? null : id;
  const savedId = existingId ?? randomUUID();
  const payload = { ...data, lines: data.lines.map((line) => ({ ...line })) };
  if (existingId) {
    const updated = await prisma.financeCalculation.updateMany({
      where: { id: existingId, ownerId: user.id, revision },
      data: { data: payload, revision: { increment: 1 } },
    });
    if (!updated.count) return { error: "This draft changed in another tab. Reload it or save a separate copy." };
  } else {
    await prisma.financeCalculation.create({ data: { id: savedId, ownerId: user.id, data: payload } });
  }

  revalidatePath("/admin/finance/calculations");
  redirect(`/admin/finance/calculations?id=${savedId}&saved=1`);
}
