export type LiveInstallmentStatus = "paid" | "overdue" | "due-soon" | "upcoming";

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
  overdue: "Overdue",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};
