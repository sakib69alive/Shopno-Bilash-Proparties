export type LiveInstallmentStatus = "paid" | "partial" | "overdue" | "due-soon" | "upcoming";

const DAY = 24 * 60 * 60 * 1000;

/**
 * An installment's status as it is *today*, not as it was last typed: paid when
 * the office marked it paid (or recorded a paid date); otherwise overdue once the
 * due date has passed, "due soon" in the last 7 days before it, else upcoming.
 * Works from the date, so it keeps itself current without anyone editing it.
 */
export function liveInstallmentStatus(inst: { status: string; paidDate?: string; dueDate: string }, today: Date = new Date()): LiveInstallmentStatus {
  if (inst.status === "paid" || inst.paidDate) return "paid";
  const due = new Date(inst.dueDate + "T23:59:59");
  const t = today.getTime();
  if (due.getTime() < t) return "overdue";
  if (due.getTime() - t <= 7 * DAY) return "due-soon";
  return "upcoming";
}

export const INSTALLMENT_STATUS_LABEL: Record<LiveInstallmentStatus, string> = {
  paid: "Paid",
  partial: "Partly paid",
  overdue: "Overdue",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};

export interface InstallmentShare {
  /** How much of this installment is covered by money received. */
  paidAmount: number;
  /** What is still owed on it (0 when paid). */
  remaining: number;
  /** The live status: "partial" when some, but not all, of it is covered and it is not yet overdue. */
  status: LiveInstallmentStatus;
}

/**
 * Money is received against the flat as a whole, not against one installment, so a client who pays 1,500 of a 2,000 installment is
 * simply 1,500 into it. This walks the installments in due order: any the office marked paid by hand count in full, and what the
 * client has paid beyond those fills the next ones in order — leaving, say, 500 still owed on the one in progress.
 */
export function allocateInstallments<T extends { id: string; amount: number; status: string; paidDate?: string; dueDate: string }>(
  installments: T[],
  paidTotal: number,
  today: Date = new Date(),
): Map<string, InstallmentShare> {
  const ordered = [...installments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const manual = ordered.filter((i) => i.status === "paid" || i.paidDate);
  let pool = Math.max(0, paidTotal - manual.reduce((sum, i) => sum + i.amount, 0));
  const out = new Map<string, InstallmentShare>();
  for (const i of ordered) {
    if (i.status === "paid" || i.paidDate) {
      out.set(i.id, { paidAmount: i.amount, remaining: 0, status: "paid" });
      continue;
    }
    const covered = Math.min(i.amount, pool);
    pool -= covered;
    const remaining = i.amount - covered;
    let status = liveInstallmentStatus(i, today);
    if (remaining <= 0) status = "paid";
    else if (covered > 0 && status !== "overdue") status = "partial";
    out.set(i.id, { paidAmount: covered, remaining, status });
  }
  return out;
}
