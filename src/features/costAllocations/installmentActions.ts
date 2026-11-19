"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { recordAuditEvent } from "@/features/audit/repository";
import {
  costAllocationRepository,
  ownerContributionRepository,
  goalInstallmentRepository,
  ownerInstallmentObligationRepository,
  contributionPaymentRepository,
} from "@/features/costAllocations/repository";
import { reconcileRounding } from "@/features/costAllocations/rounding";
import { canAccessProject } from "@/lib/projectScope";
import { goalScheduleId, getCustomInstallmentData, reviewCustomInstallment } from "@/features/costAllocations/customInstallmentData";
import type { CustomInstallmentInput } from "@/lib/goalInstallmentAllocation";
import type { GoalInstallment, InstallmentAmountMode, OwnerInstallmentObligation } from "@/types/finance/costAllocation";

export interface InstallmentPlanInput {
  label: string;
  amountMode: InstallmentAmountMode;
  amountValue: number;
  dueDate: string;
  notes?: string;
}

export interface InstallmentPlanFormState {
  error?: string;
}

async function requireFinancePermission() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (!hasPermission(user.role, "finance.manage")) throw new Error("Forbidden");
  return user;
}

function refreshGoalSchedule(id: string) {
  revalidatePath(`/admin/finance/cost-allocations/${id}`);
  revalidatePath("/admin/money-page");
  revalidatePath("/portal", "layout");
}

function isScheduleConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P1008"].includes(error.code);
}

export async function previewCustomGoalInstallment(id: string, input: CustomInstallmentInput) {
  const user = await requireFinancePermission();
  const data = await prisma.$transaction((tx) => getCustomInstallmentData(tx, user, id), { isolationLevel: "Serializable", timeout: 15000 });
  return reviewCustomInstallment(data, input, id, user.id);
}

export async function confirmCustomGoalInstallment(id: string, input: CustomInstallmentInput, token: string) {
  const user = await requireFinancePermission();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const data = await getCustomInstallmentData(tx, user, id);
      const plan = reviewCustomInstallment(data, input, id, user.id);
      if ("error" in plan) return { error: plan.error };
      if (plan.token !== token) return { error: "Member balances, the budget or the schedule changed. Review a fresh preview." };
      const scheduleId = goalScheduleId(id, plan.number);
      const now = new Date().toISOString();
      const timestamps = { createdBy: user.id, createdAt: now, updatedAt: now };
      const installment = {
        id: scheduleId, costAllocationId: id, projectId: plan.projectId, installmentNumber: plan.number,
        label: plan.label, amountMode: "fixed", customAllocation: true, amountValue: plan.total, dueDate: plan.dueDate, ...timestamps,
      } satisfies GoalInstallment;
      const obligations = plan.members.filter((member) => member.amount > 0).map((member) => {
        const row = {
          id: randomUUID(), goalInstallmentId: scheduleId, contributionId: member.id, projectId: plan.projectId,
          ownerType: member.ownerType, ownerId: member.ownerId, unitIds: member.flats.map((flat) => flat.id),
          payableAmount: { amount: member.amount, currency: "BDT" }, ...timestamps,
        } satisfies OwnerInstallmentObligation;
        return { id: row.id, data: row };
      });
      const auditId = randomUUID();
      await tx.goalInstallment.create({ data: { id: scheduleId, data: installment } });
      await tx.ownerInstallmentObligation.createMany({ data: obligations });
      await tx.auditLog.create({ data: { id: auditId, data: {
        id: auditId, actorUserId: user.id, action: "goalInstallment.createCustom", entityType: "CostAllocation",
        entityId: id, projectId: plan.projectId, occurredAt: now, newValue: { installmentId: scheduleId, total: plan.total },
      } } });
      return {};
    }, { isolationLevel: "Serializable", timeout: 15000 });
    if (!result.error) refreshGoalSchedule(id);
    return result;
  } catch (error) {
    if (isScheduleConflict(error)) return { error: "The schedule changed while saving. Review a fresh preview." };
    throw error;
  }
}

/**
 * A goal's own installment schedule — deliberately NOT the existing
 * `Installment`/`Contract` types (`src/types/sales.ts`). Those model a
 * unit's SALE-PRICE payment plan tied to a sales Contract with a customer;
 * this models a construction-goal CONTRIBUTION's payment plan, owed by
 * every owner (customer, shareholder, or landowner) with a stake in the
 * goal. Reusing the sale-side type would conflate two unrelated debts
 * under one concept, so this is a new, separate mechanism.
 *
 * Only callable once the allocation is "generated" (owner contributions
 * must already exist to split into installments). Splits each owner's
 * `payableAmount` across the given installments, reconciling per owner
 * (via `reconcileRounding`) so that owner's installments sum exactly to
 * their contribution total — never approximately.
 */
export async function createGoalInstallmentPlan(
  costAllocationId: string,
  installments: InstallmentPlanInput[],
): Promise<{ error?: string }> {
  const user = await requireFinancePermission();

  const allocation = await costAllocationRepository.findById(costAllocationId);
  if (!allocation || !canAccessProject(user, allocation.projectId)) return { error: "This allocation is unavailable." };
  if (allocation.status !== "generated" || allocation.archivedAt || allocation.completedAt) return { error: "Use an active goal with generated contributions." };
  if (!Array.isArray(installments) || installments.length === 0 || installments.length > 60) return { error: "Add between 1 and 60 installments." };
  if (installments.some((row) => !row || typeof row.label !== "string" || !row.label.trim() || row.label.length > 100 ||
    (row.amountMode !== "fixed" && row.amountMode !== "percentage") || !Number.isFinite(row.amountValue) || row.amountValue <= 0 ||
    (row.amountMode === "percentage" && row.amountValue > 100) || !/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate))) {
    return { error: "Check the label, amount and due date for each installment." };
  }

  const existingInstallments = await goalInstallmentRepository.list();
  if (existingInstallments.some((i) => i.costAllocationId === costAllocationId)) {
    return { error: "An installment plan already exists for this allocation — delete it first to redefine." };
  }

  const allContributions = await ownerContributionRepository.list();
  const contributions = allContributions.filter((c) => c.costAllocationId === costAllocationId && c.projectId === allocation.projectId);
  if (contributions.length === 0) return { error: "No owner contributions exist for this allocation." };

  const percentageMode = installments.every((i) => i.amountMode === "percentage");
  if (percentageMode) {
    const totalPercent = installments.reduce((s, i) => s + i.amountValue, 0);
    if (Math.abs(totalPercent - 100) > 0.000001) {
      return { error: `Percentages must sum to 100 — currently ${totalPercent}.` };
    }
  }

  const now = new Date().toISOString();
  const createdInstallments = installments.map((input, i) => {
    const id = goalScheduleId(costAllocationId, i + 1);
    const data = {
      id,
      costAllocationId,
      projectId: allocation.projectId,
      installmentNumber: i + 1,
      label: input.label,
      amountMode: input.amountMode,
      amountValue: input.amountValue,
      dueDate: input.dueDate,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      createdBy: user.id,
    };
    return { id, input, data };
  });

  // Per-owner reconciliation: each owner's installment shares must sum exactly to their contribution's payableAmount.
  const obligations = [];
  for (const contribution of contributions) {
    const rawPerInstallment = createdInstallments.map(({ id, input }) => ({
      key: id,
      amount:
        input.amountMode === "percentage"
          ? contribution.payableAmount.amount * (input.amountValue / 100)
          : input.amountValue,
    }));
    const reconciled = reconcileRounding(rawPerInstallment, contribution.payableAmount.amount);

    for (const { id: goalInstallmentId } of createdInstallments) {
      const row = {
        id: randomUUID(),
        goalInstallmentId,
        contributionId: contribution.id,
        projectId: allocation.projectId,
        ownerType: contribution.ownerType,
        ownerId: contribution.ownerId,
        payableAmount: { amount: reconciled.get(goalInstallmentId) ?? 0, currency: "BDT" },
        createdAt: now,
        updatedAt: now,
        createdBy: user.id,
      } satisfies OwnerInstallmentObligation;
      if (row.payableAmount.amount < 0) return { error: "The amounts exceed at least one member's contribution. Adjust the amounts or use the custom installment form." };
      obligations.push({ id: row.id, data: row });
    }
  }

  const auditId = randomUUID();
  try {
    await prisma.$transaction([
      prisma.goalInstallment.createMany({ data: createdInstallments.map(({ id, data }) => ({ id, data })) }),
      prisma.ownerInstallmentObligation.createMany({ data: obligations }),
      prisma.auditLog.create({ data: { id: auditId, data: {
        id: auditId, actorUserId: user.id, action: "goalInstallment.createPlan", entityType: "CostAllocation",
        entityId: costAllocationId, projectId: allocation.projectId, occurredAt: now,
      } } }),
    ]);
  } catch (error) {
    if (isScheduleConflict(error)) return { error: "An installment plan was already created. Refresh before retrying." };
    throw error;
  }
  refreshGoalSchedule(costAllocationId);
  return {};
}

/** Deletes an entire installment plan (all GoalInstallments + their OwnerInstallmentObligations for one allocation) — refuses once any payment has been tagged to one of its obligations, to avoid orphaning payment history. */
export async function deleteGoalInstallmentPlan(costAllocationId: string): Promise<{ error?: string }> {
  const user = await requireFinancePermission();
  const allocation = await costAllocationRepository.findById(costAllocationId);
  if (!allocation || !canAccessProject(user, allocation.projectId)) return { error: "This allocation is unavailable." };

  const installments = (await goalInstallmentRepository.list()).filter((i) => i.costAllocationId === costAllocationId);
  if (installments.length === 0) return {};

  const allObligations = await ownerInstallmentObligationRepository.list();
  const obligationIds = new Set(
    allObligations.filter((o) => installments.some((i) => i.id === o.goalInstallmentId)).map((o) => o.id),
  );
  const payments = await contributionPaymentRepository.list();
  if (payments.some((p) => p.installmentObligationId && obligationIds.has(p.installmentObligationId))) {
    return { error: "Can't delete an installment plan that already has payments recorded against it." };
  }

  for (const obligationId of obligationIds) {
    await ownerInstallmentObligationRepository.remove(obligationId);
  }
  for (const installment of installments) {
    await goalInstallmentRepository.remove(installment.id);
  }

  await recordAuditEvent({
    actorUserId: user.id,
    action: "goalInstallment.deletePlan",
    entityType: "CostAllocation",
    entityId: costAllocationId,
  });

  revalidatePath(`/admin/finance/cost-allocations/${costAllocationId}`);
  return {};
}
