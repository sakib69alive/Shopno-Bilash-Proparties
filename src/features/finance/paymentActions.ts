"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import { customerPaymentRepository } from "@/features/finance/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { saleRepository } from "@/features/sales/repository";
import type { PaymentMethod } from "@/types/finance/customer";

export interface PaymentFormState {
  error?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "bank-transfer", "cheque", "mobile-banking", "card"];

function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as string[]).includes(value);
}

async function requireFinancePermission() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "finance.manage")) throw new Error("Forbidden");
  return user;
}

async function parsePaymentFields(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "").trim();
  let projectId = String(formData.get("projectId") ?? "").trim();
  const saleId = String(formData.get("saleId") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const method = String(formData.get("method") ?? "");
  const receiptNumber = String(formData.get("receiptNumber") ?? "").trim();
  const reference = String(formData.get("reference") ?? "").trim();

  if (!customerId) return { error: "Choose a customer." } as const;
  const customer = await customerRepository.findById(customerId);
  if (!customer) return { error: "That customer no longer exists." } as const;
  if (saleId) {
    const sale = await saleRepository.findById(saleId);
    if (!sale || sale.customerId !== customerId) return { error: "That sale doesn't belong to this customer." } as const;
    projectId = sale.projectId;
  }
  if (projectId) {
    const project = await projectRepository.findById(projectId);
    if (!project) return { error: "That project no longer exists." } as const;
  }
  if (!category) return { error: "Enter a category, e.g. \"Down Payment\" or \"Installment\"." } as const;
  if (!date) return { error: "Enter a date." } as const;
  if (!isPaymentMethod(method)) return { error: "Choose a valid payment method." } as const;

  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter a valid amount." } as const;

  return {
    fields: {
      customerId,
      projectId: projectId || undefined,
      saleId: saleId || undefined,
      amount,
      category,
      date,
      method,
      receiptNumber: receiptNumber || undefined,
      reference: reference || undefined,
    },
  } as const;
}

export async function createPayment(_prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const user = await requireFinancePermission();

  const parsed = await parsePaymentFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const id = randomUUID();
  const now = new Date().toISOString();

  await customerPaymentRepository.create({
    id,
    date: fields.date,
    amount: { amount: fields.amount, currency: "BDT" },
    category: fields.category,
    projectId: fields.projectId,
    saleId: fields.saleId,
    reference: fields.reference,
    customerId: fields.customerId,
    method: fields.method,
    receiptNumber: fields.receiptNumber,
    createdAt: now,
    updatedAt: now,
    createdBy: user.id,
  });

  await recordAuditEvent({ actorUserId: user.id, action: "payment.create", entityType: "CustomerPayment", entityId: id });

  revalidatePath("/admin/sales/payments");
  // Straight to the new payment, where "Create receipt" is one click away.
  redirect(`/admin/sales/payments/${id}`);
}

export async function updatePayment(
  id: string,
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const user = await requireFinancePermission();

  const parsed = await parsePaymentFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { fields } = parsed;

  const existing = await customerPaymentRepository.findById(id);
  if (!existing) return { error: "This payment no longer exists." };

  const updated = await customerPaymentRepository.update(id, {
    date: fields.date,
    amount: { amount: fields.amount, currency: "BDT" },
    category: fields.category,
    projectId: fields.projectId,
    saleId: fields.saleId,
    reference: fields.reference,
    customerId: fields.customerId,
    method: fields.method,
    receiptNumber: fields.receiptNumber,
    updatedBy: user.id,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) return { error: "This payment no longer exists." };

  await recordAuditEvent({ actorUserId: user.id, action: "payment.update", entityType: "CustomerPayment", entityId: id });

  revalidatePath("/admin/sales/payments");
  revalidatePath(`/admin/sales/payments/${id}`);
  redirect(`/admin/sales/payments/${id}`);
}

export async function deletePayment(id: string): Promise<void> {
  const user = await requireFinancePermission();

  const existing = await customerPaymentRepository.findById(id);
  if (!existing) return;

  await customerPaymentRepository.remove(id);

  await recordAuditEvent({ actorUserId: user.id, action: "payment.delete", entityType: "CustomerPayment", entityId: id });

  revalidatePath("/admin/sales/payments");
}
