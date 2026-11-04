"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { saleRepository } from "@/features/sales/repository";

export interface PriceAdjustmentFormState {
  error?: string;
  ok?: boolean;
}

async function requireSalesUpdate() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "sales.update")) throw new Error("Forbidden");
  return user;
}

function refresh(saleId: string) {
  revalidatePath(`/admin/sales/${saleId}`);
  revalidatePath("/portal", "layout");
}

/** Raise or lower what the customer owes after the sale. A negative amount is a reduction. */
export async function addSalePriceAdjustment(
  saleId: string,
  _prev: PriceAdjustmentFormState,
  formData: FormData,
): Promise<PriceAdjustmentFormState> {
  const user = await requireSalesUpdate();

  const direction = String(formData.get("direction") ?? "decrease");
  const amountRaw = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim() || new Date().toISOString().slice(0, 10);

  if (!Number.isFinite(amountRaw) || amountRaw <= 0) return { error: "Enter the amount of the change (more than 0)." };
  if (!reason) return { error: "Add a short reason, e.g. \"Discount agreed\" or \"Extra parking\"." };

  const sale = await saleRepository.findById(saleId);
  if (!sale) return { error: "This sale no longer exists." };

  const signed = direction === "increase" ? amountRaw : -amountRaw;
  const current = sale.priceAdjustments ?? [];
  const next = [...current, { id: randomUUID(), date, amount: signed, reason }];
  if (sale.salePrice.amount + next.reduce((s, a) => s + a.amount, 0) < 0) return { error: "That would take the price below zero." };

  await saleRepository.update(saleId, { priceAdjustments: next, updatedBy: user.id, updatedAt: new Date().toISOString() });
  await recordAuditEvent({ actorUserId: user.id, action: "sale.priceAdjust", entityType: "Sale", entityId: saleId });

  refresh(saleId);
  return { ok: true };
}

export async function removeSalePriceAdjustment(saleId: string, adjustmentId: string): Promise<void> {
  const user = await requireSalesUpdate();
  const sale = await saleRepository.findById(saleId);
  if (!sale) return;

  await saleRepository.update(saleId, {
    priceAdjustments: (sale.priceAdjustments ?? []).filter((a) => a.id !== adjustmentId),
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });
  await recordAuditEvent({ actorUserId: user.id, action: "sale.priceAdjust.remove", entityType: "Sale", entityId: saleId });
  refresh(saleId);
}

/** Show or hide this flat's price / payments / balance on the owner's portal. Takes effect immediately and can be flipped back at any time. */
export async function setSaleOwnerVisibility(saleId: string, visible: boolean): Promise<void> {
  const user = await requireSalesUpdate();
  const sale = await saleRepository.findById(saleId);
  if (!sale) return;

  await saleRepository.update(saleId, { hideFromOwner: !visible, updatedBy: user.id, updatedAt: new Date().toISOString() });
  await recordAuditEvent({ actorUserId: user.id, action: visible ? "sale.ownerVisible.on" : "sale.ownerVisible.off", entityType: "Sale", entityId: saleId });
  refresh(saleId);
}
