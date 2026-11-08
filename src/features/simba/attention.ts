import "server-only";
import { prisma } from "@/lib/db";
import { liveInstallmentStatus } from "@/lib/installmentStatus";

/**
 * What needs a person's eyes right now, for Simba's "Today" tab and the red warning badge on its avatar.
 *  - `today`: time-sensitive work (overdue and due-soon installments, reminders, new enquiries).
 *  - `warnings`: things that look wrong or half-done in the data (a sale without installments, a sold flat without a price …).
 * Everything is computed live from real rows each time it is asked; nothing is stored.
 */

export interface SimbaItem {
  id: string;
  text: string;
  href: string;
  severity: "high" | "medium" | "low";
}

export interface SimbaAttention {
  today: SimbaItem[];
  warnings: SimbaItem[];
}

type Row = Record<string, unknown> & { id: string };

async function rows(model: string): Promise<Row[]> {
  const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<{ id: string; data: unknown }[]> }>)[model];
  if (!delegate) return [];
  try {
    return (await delegate.findMany()).map((r) => ({ ...(r.data as Record<string, unknown>), id: r.id }));
  } catch {
    return [];
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const DAY = 86_400_000;

export async function getSimbaAttention(): Promise<SimbaAttention> {
  const [installments, sales, units, customers, users, reminders, leads, audit, projects, credentials] = await Promise.all([
    rows("installment"),
    rows("sale"),
    rows("unit"),
    rows("customer"),
    rows("user"),
    rows("reminder"),
    rows("lead"),
    rows("auditLog"),
    rows("project"),
    prisma.ownerCredential.findMany({ select: { userId: true } }).catch(() => [] as { userId: string }[]),
  ]);

  const today: SimbaItem[] = [];
  const warnings: SimbaItem[] = [];
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  // ---- Today ----
  const live = installments
    .filter((i) => typeof i.dueDate === "string")
    .map((i) => liveInstallmentStatus({ status: String(i.status), paidDate: i.paidDate as string | undefined, dueDate: String(i.dueDate) }, now));
  const overdue = live.filter((s) => s === "overdue").length;
  const soon = live.filter((s) => s === "due-soon").length;
  if (overdue > 0) today.push({ id: "overdue", text: `${plural(overdue, "installment is", "installments are")} overdue — follow up or send a notice.`, href: "/admin/sales/installments", severity: "high" });
  if (soon > 0) today.push({ id: "soon", text: `${plural(soon, "installment is", "installments are")} due soon.`, href: "/admin/sales/installments", severity: "medium" });

  const dueReminders = reminders.filter((r) => r.status === "pending" && typeof r.date === "string" && String(r.date).slice(0, 10) <= todayKey);
  if (dueReminders.length > 0) today.push({ id: "reminders", text: `${plural(dueReminders.length, "reminder is", "reminders are")} due today or late.`, href: "/admin/reminders", severity: "medium" });

  const newLeads = leads.filter((l) => l.status === "new");
  if (newLeads.length > 0) today.push({ id: "leads", text: `${plural(newLeads.length, "new enquiry is", "new enquiries are")} waiting for a reply.`, href: "/admin/leads", severity: "medium" });

  // ---- Warnings ----
  const unitById = new Map(units.map((u) => [u.id, u]));
  const activeSales = sales.filter((s) => s.status !== "cancelled");

  const salesWithoutInstallments = activeSales.filter((s) => !installments.some((i) => i.saleId === s.id));
  if (salesWithoutInstallments.length > 0) warnings.push({ id: "no-installments", text: `${plural(salesWithoutInstallments.length, "sale has", "sales have")} no installments yet, so nothing can become due or overdue.`, href: "/admin/sales/installments/new", severity: "medium" });

  const soldNoPrice = activeSales.filter((s) => Number(unitById.get(String(s.unitId))?.basePrice) <= 0 || unitById.get(String(s.unitId))?.basePrice == null);
  if (soldNoPrice.length > 0) warnings.push({ id: "sold-no-price", text: `${plural(soldNoPrice.length, "sold flat has", "sold flats have")} no price on the unit — totals will look wrong.`, href: "/admin/properties", severity: "high" });

  const soldNoOwner = activeSales.filter((s) => {
    const u = unitById.get(String(s.unitId));
    return u && !u.customerId && !u.shareholderId && !u.landownerAllocationId;
  });
  if (soldNoOwner.length > 0) warnings.push({ id: "sold-no-owner", text: `${plural(soldNoOwner.length, "sold flat has", "sold flats have")} no owner set on the unit, so the buyer will not see it in the app.`, href: "/admin/client-page", severity: "high" });

  // Owners who cannot get into the app: they own a flat but have neither a personal link nor a phone login.
  const credentialIds = new Set(credentials.map((c) => c.userId));
  const userById = new Map(users.map((u) => [u.id, u]));
  const ownerIds = new Set(units.map((u) => u.customerId).filter(Boolean) as string[]);
  const noAccess = customers.filter((c) => {
    if (!ownerIds.has(c.id)) return false;
    const user = c.userId ? userById.get(String(c.userId)) : undefined;
    const linked = (user?.portalLink as { enabled?: boolean } | undefined)?.enabled;
    return !linked && !(user && credentialIds.has(user.id));
  });
  if (noAccess.length > 0) warnings.push({ id: "no-access", text: `${plural(noAccess.length, "flat owner has", "flat owners have")} no way into the client app yet.`, href: "/admin/client-page", severity: "medium" });

  const unpriced = units.filter((u) => !(Number(u.basePrice) > 0));
  if (unpriced.length > 0 && soldNoPrice.length === 0) warnings.push({ id: "unpriced", text: `${plural(unpriced.length, "flat has", "flats have")} no price yet.`, href: "/admin/properties", severity: "low" });

  // Backup age — only matters once there is something to lose.
  if (projects.length > 0 || units.length > 0) {
    const times = audit.filter((a) => a.action === "system.backup.download").map((a) => Date.parse(String(a.occurredAt))).filter((t) => !Number.isNaN(t));
    const last = times.length ? Math.max(...times) : null;
    const days = last ? Math.floor((now.getTime() - last) / DAY) : null;
    if (last === null) warnings.push({ id: "backup", text: "No backup has been downloaded yet. Take one so nothing is ever lost.", href: "/admin/settings/backup", severity: "low" });
    else if (days !== null && days >= 7) warnings.push({ id: "backup", text: `Your last backup was ${days} days ago. Download a fresh one.`, href: "/admin/settings/backup", severity: "low" });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  today.sort((a, b) => order[a.severity] - order[b.severity]);
  warnings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { today, warnings };
}

/** Everything Simba's demo creates carries this in its name, so it can be told apart from real records and removed again. */
export const DEMO_MARKER = "Simba Demo";

/**
 * The first real record of each kind, so a lesson can open a page that needs one ("{project}", "{customer}"…), and the demo records
 * Simba created itself ("{demoProject}"…), so the demo can open and delete exactly those. Empty when none exist.
 */
export interface SimbaSampleIds {
  project?: string;
  customer?: string;
  unit?: string;
  sale?: string;
  webProject?: string;
  webUnit?: string;
  demoProject?: string;
  demoCustomer?: string;
  demoCount?: number;
}

export async function getSimbaSampleIds(): Promise<SimbaSampleIds> {
  const [project, customer, unit, sale, webProject, webUnit] = await Promise.all([rows("project"), rows("customer"), rows("unit"), rows("sale"), rows("projectContent"), rows("unitContent")]);
  const isDemo = (r: Row) => JSON.stringify(r).includes(DEMO_MARKER);
  const demoProject = project.find(isDemo)?.id;
  const demoCustomer = customer.find(isDemo)?.id;
  const [news, gallery, expenses, budgets, phases] = await Promise.all([rows("newsArticle"), rows("galleryImage"), rows("projectExpense"), rows("projectBudget"), rows("constructionPhase")]);
  const demoCount = [project, customer, webProject, webUnit, news, gallery, expenses, budgets, phases].reduce((n, list) => n + list.filter(isDemo).length, 0);
  const real = (list: Row[]) => list.find((r) => !isDemo(r))?.id;
  return { project: real(project), customer: real(customer), unit: unit[0]?.id, sale: sale[0]?.id, webProject: real(webProject), webUnit: real(webUnit), demoProject, demoCustomer, demoCount };
}
