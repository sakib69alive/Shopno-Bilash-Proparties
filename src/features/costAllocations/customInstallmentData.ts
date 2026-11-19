import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { canAccessProject } from "@/lib/projectScope";
import { computeProjectActualCost } from "@/lib/projectFinance";
import { installmentBalance, installmentMinorUnits, parseInstallmentAmount, summarizeInstallmentAmounts, type CustomInstallmentInput } from "@/lib/goalInstallmentAllocation";
import type { User } from "@/types/user";
import type { Unit } from "@/types/unit";
import type { Purchase } from "@/types/procurement";
import type { ContractorPayment } from "@/types/contractor";
import type { ProjectBudget, ProjectExpense, FinancialAdjustment } from "@/types/finance/project";
import type {
  CostAllocation, OwnerContribution, UnitAllocation, GoalInstallment, OwnerInstallmentObligation, ContributionPayment, ContributionAdjustment,
} from "@/types/finance/costAllocation";

const readRows = <T>(rows: { data: Prisma.JsonValue }[]) => rows.map((row) => row.data as unknown as T);

export function goalScheduleId(allocationId: string, installmentNumber: number) {
  return `goal-plan-${createHash("sha256").update(JSON.stringify([allocationId, installmentNumber])).digest("hex")}`;
}

export async function getCustomInstallmentData(db: Prisma.TransactionClient, user: User, allocationId: string) {
  const row = await db.costAllocation.findUnique({ where: { id: allocationId } });
  const allocation = row?.data as unknown as CostAllocation | undefined;
  if (!allocation || !canAccessProject(user, allocation.projectId)) return { error: "This goal isn't available for your projects." } as const;
  if (allocation.status !== "generated" || allocation.archivedAt || allocation.completedAt) return { error: "Only active goals with generated contributions can receive installments." } as const;
  const projectId = allocation.projectId;
  const [c, a, u, f, i, o, p, b, e, k, m, x] = await Promise.all([
    db.ownerContribution.findMany(), db.contributionAdjustment.findMany(), db.unit.findMany(), db.unitAllocation.findMany(),
    db.goalInstallment.findMany(), db.ownerInstallmentObligation.findMany(), db.contributionPayment.findMany(),
    db.projectBudget.findMany(), db.projectExpense.findMany(), db.contractorPayment.findMany(), db.purchase.findMany(), db.financialAdjustment.findMany(),
  ]);
  const contributions = readRows<OwnerContribution>(c).filter((item) => item.costAllocationId === allocationId && item.projectId === projectId);
  const installments = readRows<GoalInstallment>(i).filter((item) => item.costAllocationId === allocationId);
  const installmentIds = new Set(installments.map((item) => item.id));
  const obligations = readRows<OwnerInstallmentObligation>(o).filter((item) => installmentIds.has(item.goalInstallmentId));
  const units = new Map(readRows<Unit>(u).filter((unit) => unit.projectId === projectId).map((unit) => [unit.id, unit.unitNumber]));
  const flats = readRows<UnitAllocation>(f).filter((item) => item.costAllocationId === allocationId && item.projectId === projectId);
  const adjustments = readRows<ContributionAdjustment>(a).filter((item) => item.projectId === projectId);
  const payments = readRows<ContributionPayment>(p);
  const budgets = readRows<ProjectBudget>(b).filter((item) => item.projectId === projectId);
  const costs = computeProjectActualCost(
    readRows<Purchase>(m).filter((item) => item.projectId === projectId),
    readRows<ProjectExpense>(e).filter((item) => item.projectId === projectId),
    readRows<ContractorPayment>(k).filter((item) => item.projectId === projectId),
    budgets,
    readRows<FinancialAdjustment>(x).filter((item) => item.projectId === projectId),
  );
  const members = contributions.map((item) => {
    const ownPayments = payments.filter((payment) => payment.contributionId === item.id);
    const recorded = ownPayments.reduce((sum, payment) => sum + payment.amount.amount, 0);
    const adjustment = adjustments.filter((entry) => entry.contributionId === item.id).reduce((sum, entry) => sum + entry.amount.amount, 0);
    const remaining = Math.max(0, item.payableAmount.amount + adjustment - Math.max(recorded, item.paidAmount.amount));
    const scheduled = obligations.filter((entry) => entry.contributionId === item.id).reduce((sum, entry) => {
      const paid = ownPayments.filter((payment) => payment.installmentObligationId === entry.id).reduce((amount, payment) => amount + payment.amount.amount, 0);
      return sum + Math.max(0, entry.payableAmount.amount - paid);
    }, 0);
    return {
      id: item.id,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      remaining: installmentBalance(remaining, scheduled),
      flats: [...new Set(item.unitIds)].flatMap((id) => {
        const label = units.get(id);
        return label ? [{ id, label, amount: flats.find((flat) => flat.contributionId === item.id && flat.unitId === id)?.payableAmount.amount }] : [];
      }),
    };
  });
  return {
    projectId,
    installments,
    members,
    budget: budgets.length ? installmentMinorUnits(-costs.variance) / 100 : null,
  } as const;
}

export function reviewCustomInstallment(data: Awaited<ReturnType<typeof getCustomInstallmentData>>, input: CustomInstallmentInput, allocationId: string, actorId: string) {
  if ("error" in data) return { error: data.error } as const;
  if (!input || typeof input.label !== "string" || typeof input.dueDate !== "string" || !Array.isArray(input.members)) {
    return { error: "Enter an installment name, due date and at least one member." } as const;
  }
  const label = input.label.trim();
  const date = new Date(`${input.dueDate}T00:00:00.000Z`);
  if (!label || label.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueDate) {
    return { error: "Enter a name up to 100 characters and a valid due date." } as const;
  }
  if (data.installments.some((row) => row.label.trim().toLowerCase() === label.toLowerCase() && row.dueDate === input.dueDate)) {
    return { error: "An installment with this name and date already exists." } as const;
  }
  if (!input.members.length || input.members.length > data.members.length) return { error: "Select at least one eligible member." } as const;
  const seen = new Set<string>();
  const seenOwners = new Set<string>();
  const members = [];
  for (const selected of input.members) {
    if (!selected || !Array.isArray(selected.flatIds) || typeof selected.amount !== "string" || seen.has(selected.contributionId)) {
      return { error: "Select each member only once." } as const;
    }
    const member = data.members.find((item) => item.id === selected.contributionId);
    const flatIds = [...new Set(selected.flatIds)];
    const cents = parseInstallmentAmount(selected.amount);
    if (!member || flatIds.some((id) => !member.flats.some((flat) => flat.id === id)) || (member.flats.length > 0 && flatIds.length === 0)) {
      return { error: "A selected member or flat is no longer eligible for this goal." } as const;
    }
    const ownerKey = `${member.ownerType}:${member.ownerId}`;
    if (seenOwners.has(ownerKey)) return { error: "Select each member only once." } as const;
    if (cents === null || cents > installmentMinorUnits(member.remaining)) {
      return { error: "Enter a valid amount within each member's unscheduled balance." } as const;
    }
    seen.add(selected.contributionId);
    seenOwners.add(ownerKey);
    members.push({ ...member, flats: member.flats.filter((flat) => flatIds.includes(flat.id)), amount: cents / 100 });
  }
  const { total, difference } = summarizeInstallmentAmounts(input.members, data.budget);
  if (!total || !Number.isSafeInteger(installmentMinorUnits(total))) return { error: "The installment must allocate a positive, valid total." } as const;
  const number = Math.max(0, ...data.installments.map((row) => row.installmentNumber)) + 1;
  const token = createHash("sha256").update(JSON.stringify({
    actorId, allocationId, label, dueDate: input.dueDate, number, budget: data.budget,
    members: members.map(({ id, remaining, flats, amount }) => ({ id, remaining, flats, amount })),
  })).digest("hex");
  return { label, dueDate: input.dueDate, number, budget: data.budget, projectId: data.projectId, members, total, difference, token } as const;
}
