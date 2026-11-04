import "server-only";
import { companySettingsRepository, COMPANY_SETTINGS_ID } from "@/features/settings/repository";
import { customerRepository } from "@/features/customers/repository";
import { projectRepository } from "@/features/projects/repository";
import { unitRepository } from "@/features/units/repository";
import { saleRepository } from "@/features/sales/repository";
import { customerPaymentRepository, projectExpenseRepository } from "@/features/finance/repository";
import { purchaseRepository, vendorRepository, materialRepository } from "@/features/procurement/repository";
import { contractorPaymentRepository, contractorRepository } from "@/features/contractors/repository";
import { contributionPaymentRepository, ownerContributionRepository } from "@/features/costAllocations/repository";
import { formatBDT, formatDate } from "@/lib/format";
import { OWNER_PAYMENT_METHOD_LABEL } from "@/lib/ownerFriendlyLabels";
import { summarizeSale } from "@/lib/salePayments";
import { takaInWords } from "@/lib/studio/words";
import type { StudioBlock, StudioDocument, StudioLetterhead } from "@/lib/studio/types";

export type StatementInput =
  | { kind: "announcement"; title: string; body: string; signer?: string; signerRole?: string; date?: string }
  | { kind: "client"; customerId: string; saleId?: string }
  | { kind: "receipt"; paymentId: string }
  | { kind: "project"; projectId: string; from?: string; to?: string }
  | { kind: "daily"; date: string; projectId?: string };

const COUNTED_STATUSES = new Set(["submitted", "verified", "completed", "pending"]);
/** A record with no status predates the field — count it; otherwise skip drafts, cancelled and rejected ones. */
const counted = (status?: string) => !status || COUNTED_STATUSES.has(status);

function ref(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `SBP-${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

const today = () => formatDate(new Date());
const dateLabel = (iso: string) => formatDate(new Date(iso));
/** Rows carry their ISO date only to be sorted; it is not shown. */
function dropIso<T extends { iso: string }>(row: T): Omit<T, "iso"> {
  const copy: Partial<T> = { ...row };
  delete copy.iso;
  return copy as Omit<T, "iso">;
}

const within = (iso: string, from?: string, to?: string) => (!from || iso >= from) && (!to || iso <= to);

export async function loadLetterhead(): Promise<StudioLetterhead> {
  const s = await companySettingsRepository.findById(COMPANY_SETTINGS_ID);
  return {
    name: s?.displayName || s?.legalName || "Shopno Bilash Properties",
    logo: s?.logo,
    logoMode: s?.logoMode,
    address: s?.address,
    phone: s?.phone,
    email: s?.email,
    website: s?.website,
  };
}

function methodLabel(m: string): string {
  return OWNER_PAYMENT_METHOD_LABEL[m] ?? m.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// ── Announcement / notice ─────────────────────────────────────────────────────────────────────
function announcement(input: Extract<StatementInput, { kind: "announcement" }>): StudioDocument {
  const blocks: StudioBlock[] = input.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
  return {
    kind: "Notice",
    title: input.title.trim() || "Announcement",
    date: input.date ? dateLabel(input.date) : today(),
    reference: ref("NT"),
    blocks,
  };
}

// ── Client payment statement ──────────────────────────────────────────────────────────────────
async function clientStatement(input: Extract<StatementInput, { kind: "client" }>): Promise<StudioDocument | { error: string }> {
  const customer = await customerRepository.findById(input.customerId);
  if (!customer) return { error: "That customer no longer exists." };

  const [allSales, payments, units, projects] = await Promise.all([
    saleRepository.list(),
    customerPaymentRepository.list(),
    unitRepository.list(),
    projectRepository.list(),
  ]);
  const customerSales = allSales.filter((s) => s.customerId === customer.id && s.status !== "cancelled");
  const sales = input.saleId ? customerSales.filter((s) => s.id === input.saleId) : customerSales;
  if (sales.length === 0) return { error: "This customer has no sale recorded yet." };

  const blocks: StudioBlock[] = [
    {
      type: "keyvalue",
      items: [
        { label: "Customer", value: customer.name },
        { label: "Phone", value: customer.phone || "—" },
        ...(customer.email ? [{ label: "Email", value: customer.email }] : []),
        { label: "Statement date", value: today() },
      ],
    },
  ];

  const attributed = new Set<string>();
  for (const sale of sales) {
    const unit = units.find((u) => u.id === sale.unitId);
    const project = projects.find((p) => p.id === sale.projectId);
    const sum = summarizeSale(sale, customerSales, payments);
    sum.payments.forEach((p) => attributed.add(p.id));

    blocks.push({ type: "heading", text: `${unit ? `Unit ${unit.unitNumber}` : "Flat"}${project ? ` — ${project.name}` : ""}` });
    blocks.push({
      type: "stats",
      items: [
        { label: sum.adjustmentsTotal !== 0 ? "Current price" : "Flat price", value: formatBDT(sum.price), note: sum.adjustmentsTotal !== 0 ? `Agreed ${formatBDT(sum.agreedPrice)}` : undefined },
        { label: "Paid", value: formatBDT(sum.paid), note: `${sum.percentPaid}% of price`, tone: "positive" },
        { label: "Remaining", value: formatBDT(sum.remaining), tone: sum.remaining > 0 ? "negative" : "positive" },
      ],
    });
    if ((sale.priceAdjustments ?? []).length > 0) {
      blocks.push({
        type: "table",
        columns: [
          { key: "date", label: "Date", weight: 1.2 },
          { key: "reason", label: "Price change", weight: 4 },
          { key: "amount", label: "Amount", align: "right", weight: 1.6 },
        ],
        rows: [...(sale.priceAdjustments ?? [])]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((a) => ({ date: dateLabel(a.date), reason: a.reason, amount: `${a.amount < 0 ? "−" : "+"}${formatBDT(Math.abs(a.amount))}` })),
      });
    }
    blocks.push({
      type: "table",
      columns: [
        { key: "date", label: "Date", weight: 1.3 },
        { key: "for", label: "For", weight: 2 },
        { key: "method", label: "Method", weight: 1.6 },
        { key: "ref", label: "Reference / receipt", weight: 2.6 },
        { key: "amount", label: "Amount", align: "right", weight: 1.6 },
      ],
      rows: [...sum.payments]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({
          date: dateLabel(p.date),
          for: p.category,
          method: methodLabel(p.method),
          ref: [p.reference, p.receiptNumber && `Receipt ${p.receiptNumber}`].filter(Boolean).join(" · ") || "—",
          amount: formatBDT(p.amount.amount),
        })),
      footer: { for: "Total received", amount: formatBDT(sum.paid) },
      emptyText: "No payment has been recorded for this flat yet.",
    });
  }

  const loose = payments.filter((p) => p.customerId === customer.id && !attributed.has(p.id));
  if (!input.saleId && loose.length > 0) {
    blocks.push({ type: "heading", text: "Other payments received" });
    blocks.push({
      type: "table",
      columns: [
        { key: "date", label: "Date", weight: 1.3 },
        { key: "for", label: "For", weight: 2 },
        { key: "method", label: "Method", weight: 1.6 },
        { key: "amount", label: "Amount", align: "right", weight: 1.6 },
      ],
      rows: loose.sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ date: dateLabel(p.date), for: p.category, method: methodLabel(p.method), amount: formatBDT(p.amount.amount) })),
    });
  }

  blocks.push({ type: "note", text: "This statement lists the payments recorded by the office up to the date above. Please contact us if anything looks different from your records." });

  return { kind: "Payment statement", title: customer.name, subtitle: sales.length === 1 ? undefined : `${sales.length} flats`, date: today(), reference: ref("ST"), blocks };
}

// ── Payment receipt ───────────────────────────────────────────────────────────────────────────
/**
 * Made right after a payment is recorded: what was received now, what has been paid in total so far
 * and what is estimated to remain, then every payment to date. The remaining figure is an estimate — it is
 * the recorded price (with any price changes) minus the payments recorded, nothing more.
 */
async function paymentReceipt(input: Extract<StatementInput, { kind: "receipt" }>): Promise<StudioDocument | { error: string }> {
  const payment = await customerPaymentRepository.findById(input.paymentId);
  if (!payment) return { error: "That payment no longer exists." };
  const customer = await customerRepository.findById(payment.customerId);
  if (!customer) return { error: "The customer of this payment no longer exists." };

  const [allSales, payments, units, projects] = await Promise.all([saleRepository.list(), customerPaymentRepository.list(), unitRepository.list(), projectRepository.list()]);
  const customerSales = allSales.filter((x) => x.customerId === customer.id && x.status !== "cancelled");
  const sale =
    customerSales.find((x) => x.id === payment.saleId) ??
    (() => {
      const candidates = customerSales.filter((x) => (payment.projectId ? x.projectId === payment.projectId : true));
      return candidates.length === 1 ? candidates[0] : undefined;
    })();
  const unit = sale ? units.find((u) => u.id === sale.unitId) : undefined;
  const project = projects.find((p) => p.id === (sale?.projectId ?? payment.projectId));

  const blocks: StudioBlock[] = [
    {
      type: "keyvalue",
      items: [
        { label: "Received from", value: customer.name },
        { label: "Receipt no.", value: payment.receiptNumber || "—" },
        { label: "Date received", value: dateLabel(payment.date) },
        { label: "Paid by", value: methodLabel(payment.method) },
        ...(payment.reference ? [{ label: "Reference", value: payment.reference }] : []),
        { label: "For", value: payment.category },
        ...(unit || project ? [{ label: "Flat", value: [unit ? `Unit ${unit.unitNumber}` : "", project?.name ?? ""].filter(Boolean).join(" — ") }] : []),
      ],
    },
    { type: "paragraph", text: `Received with thanks **৳ ${payment.amount.amount.toLocaleString("en-IN")}** (${takaInWords(payment.amount.amount)}).` },
  ];

  if (sale) {
    const sum = summarizeSale(sale, customerSales, payments);
    // A receipt speaks for the moment of this payment: only payments up to and including it count, so an older receipt is not changed by later ones.
    const upTo = sum.payments.filter((x) => x.date < payment.date || (x.date === payment.date && x.createdAt <= payment.createdAt));
    const paidToDate = upTo.reduce((a, x) => a + x.amount.amount, 0);
    const remainingToDate = Math.max(0, sum.price - paidToDate);
    const percentToDate = sum.price > 0 ? Math.min(100, Math.round((paidToDate / sum.price) * 100)) : 0;
    blocks.push({
      type: "stats",
      items: [
        { label: "Received now", value: formatBDT(payment.amount.amount), tone: "positive" },
        { label: "Total paid so far", value: formatBDT(paidToDate), note: `${percentToDate}% of ${formatBDT(sum.price)}`, tone: "positive" },
        { label: "Remaining (estimated)", value: formatBDT(remainingToDate), tone: remainingToDate > 0 ? "negative" : "positive" },
      ],
    });
    blocks.push({ type: "heading", text: "Payments up to this receipt" });
    blocks.push({
      type: "table",
      columns: [
        { key: "date", label: "Date", weight: 1.3 },
        { key: "for", label: "For", weight: 2 },
        { key: "method", label: "Method", weight: 1.6 },
        { key: "ref", label: "Reference / receipt", weight: 2.6 },
        { key: "amount", label: "Amount", align: "right", weight: 1.6 },
      ],
      rows: [...upTo]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => ({
          date: dateLabel(p.date),
          for: p.id === payment.id ? `${p.category} (this receipt)` : p.category,
          method: methodLabel(p.method),
          ref: [p.reference, p.receiptNumber && `Receipt ${p.receiptNumber}`].filter(Boolean).join(" · ") || "—",
          amount: formatBDT(p.amount.amount),
        })),
      footer: { for: "Total received", amount: formatBDT(paidToDate) },
    });
    blocks.push({ type: "note", text: "The remaining amount is an estimate: the recorded price of the flat (including any price changes) minus the payments recorded so far. Charges or changes made later may alter it." });
  } else {
    const paidByCustomer = payments.filter((p) => p.customerId === customer.id).reduce((a, p) => a + p.amount.amount, 0);
    blocks.push({ type: "stats", items: [{ label: "Received now", value: formatBDT(payment.amount.amount), tone: "positive" }, { label: "Total paid by you so far", value: formatBDT(paidByCustomer), tone: "positive" }] });
  }

  return {
    kind: "Payment receipt",
    title: customer.name,
    subtitle: `${formatBDT(payment.amount.amount)} received${unit ? ` · Unit ${unit.unitNumber}` : ""}`,
    date: dateLabel(payment.date),
    reference: payment.receiptNumber ? `Receipt ${payment.receiptNumber}` : ref("RC"),
    blocks,
  };
}

// ── Project summary ───────────────────────────────────────────────────────────────────────────
async function projectSummary(input: Extract<StatementInput, { kind: "project" }>): Promise<StudioDocument | { error: string }> {
  const project = await projectRepository.findById(input.projectId);
  if (!project) return { error: "That project no longer exists." };
  const { from, to } = input;

  const [customerPays, expenses, purchases, contractorPays, vendors, materials, contractors, contributions, contributionPays] = await Promise.all([
    customerPaymentRepository.list(),
    projectExpenseRepository.list(),
    purchaseRepository.list(),
    contractorPaymentRepository.list(),
    vendorRepository.list(),
    materialRepository.list(),
    contractorRepository.list(),
    ownerContributionRepository.list(),
    contributionPaymentRepository.list(),
  ]);

  const received = customerPays.filter((p) => p.projectId === project.id && within(p.date, from, to));
  const contributionIds = new Set(contributions.filter((c) => c.projectId === project.id).map((c) => c.id));
  const contributionReceived = contributionPays.filter((p) => contributionIds.has(p.contributionId) && within(p.date, from, to));
  const spentExpenses = expenses.filter((e) => e.projectId === project.id && counted(e.status) && within(e.date, from, to));
  const spentPurchases = purchases.filter((p) => p.projectId === project.id && within(p.purchaseDate ?? p.createdAt.slice(0, 10), from, to));
  const spentContractors = contractorPays.filter((p) => p.projectId === project.id && counted(p.status) && within(p.date, from, to));

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totalReceived = sum(received.map((p) => p.amount.amount)) + sum(contributionReceived.map((p) => p.amount.amount));
  const expenseTotal = sum(spentExpenses.map((e) => e.amount.amount));
  const purchaseTotal = sum(spentPurchases.map((p) => p.total.amount));
  const contractorTotal = sum(spentContractors.map((p) => p.amount.amount));
  const totalSpent = expenseTotal + purchaseTotal + contractorTotal;
  const net = totalReceived - totalSpent;
  const budget = project.budget?.amount;

  const period = from || to ? `${from ? dateLabel(from) : "Start"} – ${to ? dateLabel(to) : "today"}` : "All time";

  const blocks: StudioBlock[] = [
    {
      type: "stats",
      items: [
        { label: "Money received", value: formatBDT(totalReceived), tone: "positive" },
        { label: "Money spent", value: formatBDT(totalSpent), tone: "negative" },
        { label: "Balance", value: formatBDT(net), tone: net >= 0 ? "positive" : "negative" },
      ],
    },
    {
      type: "keyvalue",
      items: [
        { label: "Project", value: project.name },
        { label: "Period", value: period },
        ...(budget ? [{ label: "Budget", value: `${formatBDT(budget)} · ${Math.round((totalSpent / budget) * 100)}% spent` }] : []),
        { label: "Status", value: project.status.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()) },
      ],
    },
    { type: "heading", text: "Where the money went" },
    {
      type: "table",
      columns: [
        { key: "what", label: "Spent on", weight: 4 },
        { key: "count", label: "Entries", align: "right", weight: 1 },
        { key: "amount", label: "Amount", align: "right", weight: 2 },
      ],
      rows: [
        { what: "Project expenses", count: String(spentExpenses.length), amount: formatBDT(expenseTotal) },
        { what: "Material purchases", count: String(spentPurchases.length), amount: formatBDT(purchaseTotal) },
        { what: "Contractor payments", count: String(spentContractors.length), amount: formatBDT(contractorTotal) },
      ],
      footer: { what: "Total spent", amount: formatBDT(totalSpent) },
    },
  ];

  // Expenses by category
  const byCategory = new Map<string, number>();
  spentExpenses.forEach((e) => byCategory.set(e.category || "Other", (byCategory.get(e.category || "Other") ?? 0) + e.amount.amount));
  if (byCategory.size > 0) {
    blocks.push({ type: "heading", text: "Expenses by category" });
    blocks.push({
      type: "table",
      columns: [
        { key: "cat", label: "Category", weight: 4 },
        { key: "amount", label: "Amount", align: "right", weight: 2 },
      ],
      rows: [...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({ cat, amount: formatBDT(amt) })),
    });
  }

  blocks.push({ type: "heading", text: "Money received" });
  blocks.push({
    type: "table",
    columns: [
      { key: "date", label: "Date", weight: 1.3 },
      { key: "from", label: "From", weight: 2.4 },
      { key: "kind", label: "For", weight: 2 },
      { key: "amount", label: "Amount", align: "right", weight: 1.6 },
    ],
    rows: [
      ...received.map((p) => ({ iso: p.date, date: dateLabel(p.date), from: "Customer", kind: p.category, amount: formatBDT(p.amount.amount) })),
      ...contributionReceived.map((p) => ({ iso: p.date, date: dateLabel(p.date), from: "Owner contribution", kind: "Construction", amount: formatBDT(p.amount.amount) })),
    ]
      .sort((a, b) => b.iso.localeCompare(a.iso))
      .map(dropIso),
    footer: { from: "Total received", amount: formatBDT(totalReceived) },
    emptyText: "No money received in this period.",
  });

  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? "";
  const spendRows = [
    ...spentExpenses.map((e) => ({ iso: e.date, date: dateLabel(e.date), what: e.description, kind: e.category || "Expense", amount: formatBDT(e.amount.amount) })),
    ...spentPurchases.map((p) => ({
      iso: p.purchaseDate ?? p.createdAt.slice(0, 10),
      date: dateLabel(p.purchaseDate ?? p.createdAt),
      what: `${materials.find((m) => m.id === p.materialId)?.name ?? "Purchase"}${p.quantity ? ` · ${p.quantity} ${p.unit ?? ""}` : ""}${vendorName(p.vendorId) ? ` · ${vendorName(p.vendorId)}` : ""}`,
      kind: "Purchase",
      amount: formatBDT(p.total.amount),
    })),
    ...spentContractors.map((p) => ({ iso: p.date, date: dateLabel(p.date), what: contractors.find((c) => c.id === p.contractorId)?.name ?? "Contractor", kind: "Contractor payment", amount: formatBDT(p.amount.amount) })),
  ].sort((a, b) => b.iso.localeCompare(a.iso));

  blocks.push({ type: "heading", text: "Money spent" });
  blocks.push({
    type: "table",
    columns: [
      { key: "date", label: "Date", weight: 1.3 },
      { key: "what", label: "Details", weight: 3.6 },
      { key: "kind", label: "Type", weight: 1.8 },
      { key: "amount", label: "Amount", align: "right", weight: 1.6 },
    ],
    rows: spendRows.map(dropIso),
    footer: { what: "Total spent", amount: formatBDT(totalSpent) },
    emptyText: "No spending recorded in this period.",
  });

  return { kind: "Project summary", title: project.name, subtitle: period, date: today(), reference: ref("PR"), blocks };
}

// ── Daily report ──────────────────────────────────────────────────────────────────────────────
async function dailyReport(input: Extract<StatementInput, { kind: "daily" }>): Promise<StudioDocument | { error: string }> {
  const day = input.date;
  if (!day) return { error: "Choose a date." };
  const project = input.projectId ? await projectRepository.findById(input.projectId) : null;
  if (input.projectId && !project) return { error: "That project no longer exists." };

  const [customerPays, expenses, purchases, contractorPays, vendors, materials, contractors, projects, customers, contributions, contributionPays] = await Promise.all([
    customerPaymentRepository.list(),
    projectExpenseRepository.list(),
    purchaseRepository.list(),
    contractorPaymentRepository.list(),
    vendorRepository.list(),
    materialRepository.list(),
    contractorRepository.list(),
    projectRepository.list(),
    customerRepository.list(),
    ownerContributionRepository.list(),
    contributionPaymentRepository.list(),
  ]);
  const inScope = (pid?: string) => !project || pid === project.id;
  const projectName = (pid?: string) => projects.find((p) => p.id === pid)?.name ?? "—";

  const received = customerPays.filter((p) => p.date === day && inScope(p.projectId));
  const contributionById = new Map(contributions.map((c) => [c.id, c]));
  const contributionReceived = contributionPays.filter((p) => p.date === day && inScope(contributionById.get(p.contributionId)?.projectId));
  const spentExpenses = expenses.filter((e) => e.date === day && counted(e.status) && inScope(e.projectId));
  const spentPurchases = purchases.filter((p) => (p.purchaseDate ?? p.createdAt.slice(0, 10)) === day && inScope(p.projectId));
  const spentContractors = contractorPays.filter((p) => p.date === day && counted(p.status) && inScope(p.projectId));

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totalReceived = sum(received.map((p) => p.amount.amount)) + sum(contributionReceived.map((p) => p.amount.amount));
  const totalSpent = sum(spentExpenses.map((e) => e.amount.amount)) + sum(spentPurchases.map((p) => p.total.amount)) + sum(spentContractors.map((p) => p.amount.amount));
  const net = totalReceived - totalSpent;

  const blocks: StudioBlock[] = [
    {
      type: "stats",
      items: [
        { label: "Received today", value: formatBDT(totalReceived), tone: "positive" },
        { label: "Spent today", value: formatBDT(totalSpent), tone: "negative" },
        { label: "Net", value: formatBDT(net), tone: net >= 0 ? "positive" : "negative" },
      ],
    },
    { type: "heading", text: "Money received" },
    {
      type: "table",
      columns: [
        { key: "who", label: "From", weight: 2.6 },
        { key: "project", label: "Project", weight: 2.2 },
        { key: "for", label: "For", weight: 2 },
        { key: "method", label: "Method", weight: 1.5 },
        { key: "amount", label: "Amount", align: "right", weight: 1.6 },
      ],
      rows: [
        ...received.map((p) => ({ who: customers.find((c) => c.id === p.customerId)?.name ?? "Customer", project: projectName(p.projectId), for: p.category, method: methodLabel(p.method), amount: formatBDT(p.amount.amount) })),
        ...contributionReceived.map((p) => ({ who: "Owner contribution", project: projectName(contributionById.get(p.contributionId)?.projectId), for: "Construction", method: methodLabel(p.method), amount: formatBDT(p.amount.amount) })),
      ],
      footer: { who: "Total received", amount: formatBDT(totalReceived) },
      emptyText: "No money was received on this day.",
    },
    { type: "heading", text: "Money spent" },
    {
      type: "table",
      columns: [
        { key: "what", label: "Details", weight: 3.6 },
        { key: "project", label: "Project", weight: 2.2 },
        { key: "kind", label: "Type", weight: 1.8 },
        { key: "amount", label: "Amount", align: "right", weight: 1.6 },
      ],
      rows: [
        ...spentExpenses.map((e) => ({ what: e.description, project: projectName(e.projectId), kind: e.category || "Expense", amount: formatBDT(e.amount.amount) })),
        ...spentPurchases.map((p) => ({
          what: `${materials.find((m) => m.id === p.materialId)?.name ?? "Purchase"}${p.quantity ? ` · ${p.quantity} ${p.unit ?? ""}` : ""}${vendors.find((v) => v.id === p.vendorId)?.name ? ` · ${vendors.find((v) => v.id === p.vendorId)?.name}` : ""}`,
          project: projectName(p.projectId),
          kind: "Purchase",
          amount: formatBDT(p.total.amount),
        })),
        ...spentContractors.map((p) => ({ what: contractors.find((c) => c.id === p.contractorId)?.name ?? "Contractor", project: projectName(p.projectId), kind: "Contractor payment", amount: formatBDT(p.amount.amount) })),
      ],
      footer: { what: "Total spent", amount: formatBDT(totalSpent) },
      emptyText: "No spending was recorded on this day.",
    },
  ];

  return { kind: "Daily report", title: dateLabel(day), subtitle: project ? project.name : "All projects", date: today(), reference: ref("DR"), blocks };
}

export async function buildStatement(input: StatementInput): Promise<StudioDocument | { error: string }> {
  switch (input.kind) {
    case "announcement":
      return announcement(input);
    case "client":
      return clientStatement(input);
    case "receipt":
      return paymentReceipt(input);
    case "project":
      return projectSummary(input);
    case "daily":
      return dailyReport(input);
  }
}
