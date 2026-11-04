"use server";

import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { buildStatement, loadLetterhead, type StatementInput } from "@/features/statements/builders";
import type { StudioDocument, StudioLetterhead } from "@/lib/studio/types";

export type GenerateStatementResult = { doc: StudioDocument; letterhead: StudioLetterhead } | { error: string };

/**
 * Builds a branded document from the real records. Read-only — it writes
 * nothing; the PDF / image are produced in the browser from what this returns.
 * Needs finance access, because the documents can show money received and spent.
 */
export async function generateStatement(input: StatementInput): Promise<GenerateStatementResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const isNotice = input.kind === "announcement";
  if (!hasPermission(user.role, isNotice ? "reports.view" : "finance.view")) return { error: "You don't have permission to create this document." };

  const result = await buildStatement(input);
  if ("error" in result) return { error: result.error };
  return { doc: result, letterhead: await loadLetterhead() };
}
