import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Repository } from "@/lib/repository";
import type { ID } from "@/types/common";

interface JsonRow {
  id: string;
  data: Prisma.JsonValue;
}

/**
 * The subset of a generated Prisma model delegate this adapter actually
 * calls — deliberately narrow (matches `Repository<T>`'s own five methods,
 * see `src/lib/repository.ts`) rather than the full generated delegate
 * type, which is easier to get structurally wrong when written generically.
 */
interface JsonModelDelegate {
  findMany(): Promise<JsonRow[]>;
  findUnique(args: { where: { id: string } }): Promise<JsonRow | null>;
  create(args: { data: { id: string; data: Prisma.InputJsonValue } }): Promise<JsonRow>;
  update(args: { where: { id: string }; data: { data: Prisma.InputJsonValue } }): Promise<JsonRow>;
  delete(args: { where: { id: string } }): Promise<JsonRow>;
}

/**
 * Every model in `prisma/schema.prisma` (bar `Credential`) follows the same
 * `{ id, data: Json }` shape — see that file's own comment for why. `name`
 * here is the camelCase property Prisma generates on the client for each
 * model (`prisma.vendor`, `prisma.materialCategory`, `prisma.newsArticle`,
 * …) — kept as an explicit union, not inferred from `keyof PrismaClient`,
 * so a typo is a compile error pointing at this file, not a runtime crash
 * inside whichever feature happened to call it first.
 */
export type PrismaJsonModel =
  | "user"
  | "auditLog"
  | "project"
  | "projectContent"
  | "unit"
  | "building"
  | "floor"
  | "parking"
  | "ownershipRecord"
  | "unitContent"
  | "customer"
  | "constructionPhase"
  | "constructionTask"
  | "lead"
  | "document"
  | "customerPayment"
  | "projectExpense"
  | "projectBudget"
  | "sale"
  | "installment"
  | "vendor"
  | "materialCategory"
  | "material"
  | "purchaseOrder"
  | "purchase"
  | "shareholder"
  | "shareholding"
  | "landowner"
  | "agreement"
  | "landownerAllocation"
  | "notification"
  | "companySettings"
  | "newsArticle"
  | "galleryImage"
  | "pageContent"
  | "founderProfile"
  | "teamMember"
  | "costAllocation"
  | "ownerContribution"
  | "contributionPayment"
  | "unitAllocation"
  | "goalInstallment"
  | "ownerInstallmentObligation"
  | "contributionAdjustment"
  | "unitTier"
  | "stockMovement"
  | "purchaseReceipt"
  | "materialThreshold"
  | "contractor"
  | "contractorAssignment"
  | "contractorPayment"
  | "milestone"
  | "scheduleRevision"
  | "constructionActivityLog"
  | "cashAccount"
  | "financialAdjustment"
  | "booking"
  | "ownershipTransfer"
  | "reminder"
  | "notificationPreference"
  | "companyMilestone"
  | "policyRule";

/**
 * Backs a feature's `Repository<T>` with the real, on-disk SQLite database
 * instead of `InMemoryRepository`'s plain in-process array — the actual
 * fix for "every record disappears when the server restarts." One
 * implementation shared by all 29 domains (see `prisma/schema.prisma`),
 * so there's a single place to get `list`/`findById`/`create`/`update`/
 * `remove` right, not 29 hand-written copies.
 *
 * `update`'s merge semantics (`{ ...existing, ...patch }`) intentionally
 * match `InMemoryRepository.update`'s exact behavior — every call site
 * written against the old in-memory repositories keeps working unchanged.
 */
export function createPrismaRepository<T extends { id: ID }>(name: PrismaJsonModel): Repository<T> {
  const delegate = prisma[name] as unknown as JsonModelDelegate;

  return {
    async list(): Promise<T[]> {
      const rows = await delegate.findMany();
      return rows.map((row) => row.data as T);
    },

    async findById(id: ID): Promise<T | null> {
      const row = await delegate.findUnique({ where: { id } });
      return row ? (row.data as T) : null;
    },

    async create(entity: T): Promise<T> {
      await delegate.create({ data: { id: entity.id, data: entity as unknown as Prisma.InputJsonValue } });
      return entity;
    },

    async update(id: ID, patch: Partial<T>): Promise<T | null> {
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) return null;

      const merged = { ...(existing.data as T), ...patch };
      await delegate.update({ where: { id }, data: { data: merged as unknown as Prisma.InputJsonValue } });
      return merged;
    },

    async remove(id: ID): Promise<boolean> {
      try {
        await delegate.delete({ where: { id } });
        return true;
      } catch {
        return false;
      }
    },
  };
}
