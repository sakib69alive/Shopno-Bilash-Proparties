import "server-only";
import { prisma } from "@/lib/db";

/**
 * "Remove demo data": clears the practice records so the company can start clean with its real business.
 *
 * Always removed: every business record (projects, buildings, floors, units, parking, owners, clients, shareholders, landowners,
 * sales, installments, payments, budgets, cost splits, expenses, construction, materials, documents, notifications, reminders…)
 * and the client-app sign-ins of the people removed with them.
 * Optionally removed: the public website's own content (website projects and properties, news, gallery, team, story, policy rules).
 * Always kept: staff accounts and their passwords, company settings, the website's page wording, the founder profile, the audit log.
 */

const BUSINESS_MODELS = [
  "project", "building", "floor", "unit", "parking", "ownershipRecord", "ownershipTransfer", "customer",
  "constructionPhase", "constructionTask", "contractor", "contractorAssignment", "contractorPayment", "milestone", "scheduleRevision", "constructionActivityLog",
  "lead", "document", "customerPayment", "projectExpense", "projectBudget", "sale", "installment", "booking",
  "vendor", "materialCategory", "material", "purchaseOrder", "purchase", "purchaseReceipt", "materialThreshold", "stockMovement",
  "shareholder", "shareholding", "landowner", "agreement", "landownerAllocation",
  "notification", "notificationPreference", "reminder",
  "costAllocation", "ownerContribution", "contributionPayment", "unitAllocation", "goalInstallment", "ownerInstallmentObligation", "contributionAdjustment", "unitTier",
  "cashAccount", "financialAdjustment",
] as const;

const WEBSITE_MODELS = ["projectContent", "unitContent", "newsArticle", "galleryImage", "teamMember", "companyMilestone", "policyRule"] as const;

const PORTAL_ROLES = ["customer", "shareholder", "landowner"];

export interface WipeResult {
  removed: Record<string, number>;
  total: number;
  skipped: string[];
}

type Delegate = { count: () => Promise<number>; deleteMany: (args?: unknown) => unknown };

export async function wipeDemoData(options: { website: boolean }): Promise<WipeResult> {
  const names: string[] = [...BUSINESS_MODELS, ...(options.website ? WEBSITE_MODELS : [])];
  const client = prisma as unknown as Record<string, Delegate | undefined>;
  const removed: Record<string, number> = {};
  const skipped: string[] = [];
  const ops: unknown[] = [];

  for (const name of names) {
    const delegate = client[name];
    if (!delegate || typeof delegate.deleteMany !== "function") {
      skipped.push(name);
      continue;
    }
    removed[name] = await delegate.count();
    ops.push(delegate.deleteMany());
  }

  // Sign-ins of the clients being removed: their user rows (not staff) and their phone + PIN.
  const users = await prisma.user.findMany();
  const portalIds = users.filter((u) => PORTAL_ROLES.includes(String((u.data as { role?: string } | null)?.role))).map((u) => u.id);
  if (portalIds.length > 0) {
    removed.portalUser = portalIds.length;
    ops.push(prisma.user.deleteMany({ where: { id: { in: portalIds } } }));
    ops.push(prisma.ownerCredential.deleteMany({ where: { userId: { in: portalIds } } }));
  }

  await prisma.$transaction(ops as never[]);

  const total = Object.values(removed).reduce((a, b) => a + b, 0);
  return { removed, total, skipped };
}
