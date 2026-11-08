import "server-only";
import { prisma } from "@/lib/db";
import { COMPANY_SETTINGS_ID } from "@/features/settings/repository";

/**
 * Live facts for Simba, the admin helper. Everything here is read from the real database each time it is asked, so the helper's
 * checklists tick themselves as soon as something is saved. Rows are stored as `{ id, data }` JSON, so a model is read whole and
 * filtered in memory — fine at this size, and it keeps this file one uniform helper instead of 30 hand-written queries.
 */

type Row = Record<string, unknown> & { id: string };

async function rows(model: string): Promise<Row[]> {
  const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<{ id: string; data: unknown }[]> }>)[model];
  if (!delegate) return [];
  try {
    const list = await delegate.findMany();
    return list.map((r) => ({ ...(r.data as Record<string, unknown>), id: r.id }));
  } catch {
    return [];
  }
}

export interface SimbaCheck {
  id: string;
  done: boolean;
  /** A short live fact, e.g. "3 units added". */
  detail?: string;
}

export interface SimbaProjectCheck extends SimbaCheck {
  label: string;
  major: boolean;
  why: string;
  how: string;
  href: string;
}

export interface SimbaStatus {
  /** Global setup steps (see `content/simba/journey.ts`) — id → done. */
  journey: SimbaCheck[];
  project?: { id: string; name: string; checks: SimbaProjectCheck[] };
  generatedAt: string;
  /** Today's work and things that look wrong — see `attention.ts`. */
  attention?: import("./attention").SimbaAttention;
  ids?: import("./attention").SimbaSampleIds;
}

const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const count = (label: string, c: number) => `${c} ${label}${c === 1 ? "" : "s"}`;

export async function getSimbaStatus(projectId?: string): Promise<SimbaStatus> {
  const [settingsRow, projects, buildings, floors, units, parking, customers, shareholders, landowners, sales, installments, payments, budgets, allocations, phases, vendors, purchases, expenses, documents, webProjects, news, gallery, users] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: COMPANY_SETTINGS_ID } }),
    rows("project"),
    rows("building"),
    rows("floor"),
    rows("unit"),
    rows("parking"),
    rows("customer"),
    rows("shareholder"),
    rows("landowner"),
    rows("sale"),
    rows("installment"),
    rows("customerPayment"),
    rows("projectBudget"),
    rows("costAllocation"),
    rows("constructionPhase"),
    rows("vendor"),
    rows("purchase"),
    rows("projectExpense"),
    rows("document"),
    rows("projectContent"),
    rows("newsArticle"),
    rows("galleryImage"),
    rows("user"),
  ]);

  const settings = (settingsRow?.data ?? {}) as Record<string, unknown>;
  const staff = users.filter((u) => !["customer", "shareholder", "landowner"].includes(String(u.role)));
  const unitsOwned = units.filter((u) => u.customerId || u.shareholderId || u.landownerAllocationId);
  const plansUploaded = projects.filter((p) => Array.isArray(p.floorPlans) && (p.floorPlans as unknown[]).length > 0);
  const linkOn = users.filter((u) => (u.portalLink as { enabled?: boolean } | undefined)?.enabled);

  const journey: SimbaCheck[] = [
    { id: "company", done: !!settings.phone && !!settings.displayName && !!settings.logo, detail: settings.logo ? "Logo and contact saved" : "Logo or phone is missing" },
    { id: "team", done: staff.length > 1, detail: count("staff account", staff.length) },
    { id: "project", done: projects.length > 0, detail: count("project", projects.length) },
    { id: "structure", done: buildings.length > 0 && floors.length > 0 && units.length > 0, detail: `${count("building", buildings.length)}, ${count("floor", floors.length)}, ${count("unit", units.length)}` },
    { id: "plans", done: plansUploaded.length > 0, detail: count("project", plansUploaded.length) + " with floor plans" },
    { id: "parking", done: parking.length > 0, detail: count("parking spot", parking.length) },
    { id: "clients", done: customers.length + shareholders.length + landowners.length > 0, detail: `${count("customer", customers.length)}, ${count("shareholder", shareholders.length)}, ${count("landowner", landowners.length)}` },
    { id: "owners", done: unitsOwned.length > 0, detail: `${unitsOwned.length} of ${units.length} units have an owner` },
    { id: "sales", done: sales.length > 0, detail: count("sale", sales.length) },
    { id: "installments", done: installments.length > 0, detail: count("installment", installments.length) },
    { id: "payments", done: payments.length > 0, detail: count("payment", payments.length) + " recorded" },
    { id: "budget", done: budgets.length > 0 && allocations.length > 0, detail: `${count("budget", budgets.length)}, ${count("cost split", allocations.length)}` },
    { id: "construction", done: phases.length > 0, detail: count("phase", phases.length) },
    { id: "materials", done: vendors.length > 0 && purchases.length > 0, detail: `${count("vendor", vendors.length)}, ${count("purchase", purchases.length)}` },
    { id: "documents", done: documents.length > 0, detail: count("document", documents.length) },
    { id: "website", done: webProjects.length > 0 && news.length + gallery.length > 0, detail: `${count("website project", webProjects.length)}, ${count("news article", news.length)}, ${count("gallery photo", gallery.length)}` },
    { id: "clientApp", done: linkOn.length > 0, detail: linkOn.length > 0 ? count("client link", linkOn.length) + " on" : "No client has a link yet" },
  ];

  let project: SimbaStatus["project"];
  const current = projectId ? projects.find((p) => p.id === projectId) : undefined;
  if (current) {
    const pid = current.id;
    const mine = <T extends Row>(list: T[]) => list.filter((r) => r.projectId === pid);
    const pUnits = mine(units);
    const pOwned = pUnits.filter((u) => u.customerId || u.shareholderId || u.landownerAllocationId);
    const pPriced = pUnits.filter((u) => n(u.basePrice) > 0);
    const pBuildings = mine(buildings);
    const pFloors = mine(floors);
    const pParking = mine(parking);
    const pSales = mine(sales);
    const pBudgets = mine(budgets);
    const pAllocations = mine(allocations);
    const pPhases = mine(phases);
    const pExpenses = mine(expenses);
    const pPurchases = mine(purchases);
    const pDocs = documents.filter((d) => d.ownerType === "project" && d.ownerId === pid);
    const planCount = Array.isArray(current.floorPlans) ? (current.floorPlans as unknown[]).length : 0;
    const ownedPct = pUnits.length ? Math.round((pOwned.length / pUnits.length) * 100) : 0;
    const siteLive = webProjects.some((w) => String(w.name).trim().toLowerCase() === String(current.name).trim().toLowerCase());
    const base = `/admin/projects/${pid}`;

    const checks: SimbaProjectCheck[] = [
      { id: "basics", label: "Project details", major: true, done: !!current.name && !!current.address && !!current.city, detail: current.address ? String(current.address) : "Address is empty", why: "Name, address and status appear everywhere — reports, notices and the client app.", how: "Open Settings and fill the name, address, city and status.", href: `${base}/edit` },
      { id: "buildings", label: "Buildings", major: true, done: pBuildings.length > 0, detail: count("building", pBuildings.length), why: "Floors and units hang under a building. Without one you cannot add either.", how: "Open Units and use the Add building button, or the structure builder.", href: `${base}/units` },
      { id: "floors", label: "Floors", major: true, done: pFloors.length > 0, detail: count("floor", pFloors.length), why: "Units are placed on floors, and the floor plans follow floors.", how: "Open Units and add floors (the bulk structure generator can add all floors at once).", href: `${base}/units` },
      { id: "units", label: "Units (flats)", major: true, done: pUnits.length > 0, detail: count("unit", pUnits.length), why: "Every sale, owner, payment and plan is tied to a unit.", how: "Open Units and add flats one by one, or generate many at once.", href: `${base}/units` },
      { id: "prices", label: "Unit prices", major: true, done: pUnits.length > 0 && pPriced.length === pUnits.length, detail: `${pPriced.length} of ${pUnits.length} units priced`, why: "Sale totals, installments and budget splits are worked out from unit prices.", how: "Open Units, open each unit and enter its base price (and any extra charges or discount).", href: `${base}/units` },
      { id: "plans", label: "Floor plans (client app)", major: true, done: planCount > 0, detail: count("plan", planCount), why: "Owners see their own flat lit up on the plan in the client app.", how: "Open Floor plans, upload the typical floor drawing and mark each flat's area.", href: `${base}/floor-plans` },
      { id: "owners", label: "Owners assigned to flats", major: true, done: pUnits.length > 0 && pOwned.length > 0, detail: `${pOwned.length} of ${pUnits.length} flats (${ownedPct}%)`, why: "Until a flat has an owner, nobody sees it in the client app and no payments can be matched.", how: "Open Distribute, and drag each flat onto its customer, shareholder or landowner.", href: `${base}/distribute` },
      { id: "sales", label: "Sales recorded", major: true, done: pSales.length > 0, detail: count("sale", pSales.length), why: "A sale holds the agreed price and the payment plan for a customer's flat.", how: "Open Sales → New sale, choose the flat and the customer.", href: "/admin/sales/new" },
      { id: "budget", label: "Project budget", major: false, done: pBudgets.length > 0, detail: count("budget line", pBudgets.length), why: "A budget lets the dashboard compare planned against real spending.", how: "Open Project Finance → New budget and add the planned amounts.", href: `/admin/finance/project-costs?projectId=${pid}` },
      { id: "split", label: "Cost split among owners", major: false, done: pAllocations.length > 0, detail: count("split", pAllocations.length), why: "A cost split tells each owner how much of a shared cost they pay and when.", how: "Open Budgets & cost splits → New budget split and follow the steps.", href: "/admin/finance/cost-allocations/new" },
      { id: "construction", label: "Construction phases", major: false, done: pPhases.length > 0, detail: count("phase", pPhases.length), why: "Phases drive the progress owners see on their Construction tab and on the public site.", how: "Open Construction and add the phases with start and target dates.", href: `${base}/construction` },
      { id: "parking", label: "Parking", major: false, done: pParking.length > 0, detail: count("spot", pParking.length), why: "Parking spots can be given to flats and show in the owner's app.", how: "Open Parking and add spots, or generate many at once.", href: `${base}/parking` },
      { id: "expenses", label: "Expenses", major: false, done: pExpenses.length + pPurchases.length > 0, detail: `${count("expense", pExpenses.length)}, ${count("purchase", pPurchases.length)}`, why: "Real spending makes the Budget vs Actual numbers true.", how: "Open Expenses or Materials and record what was spent.", href: `${base}/expenses` },
      { id: "documents", label: "Documents", major: false, done: pDocs.length > 0, detail: count("document", pDocs.length), why: "Owners can open and download papers you upload here.", how: "Open Documents and upload agreements, plans or receipts for this project.", href: `${base}/documents` },
      { id: "website", label: "Public website page", major: false, done: siteLive, detail: siteLive ? "A website project with this name exists" : "No website project with this name", why: "The public site shows projects from Website content, which is separate from this record.", how: "Open Public page → A project's public page → Add a project to the website.", href: "/admin/public-page" },
    ];
    project = { id: pid, name: String(current.name), checks };
  }

  return { journey, project, generatedAt: new Date().toISOString() };
}
