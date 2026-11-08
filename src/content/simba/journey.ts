import type { Permission } from "@/config/permissions";

/**
 * Simba's route from an empty system to a finished one, in the order the work is best done. `id` matches the live checks in
 * `features/simba/status.ts`. `major` steps are needed before the system is useful; the rest are optional extras. Written in plain
 * words on purpose: someone who has never used the panel must be able to follow it start to finish.
 */
export interface JourneyStep {
  id: string;
  title: string;
  major: boolean;
  why: string;
  how: string[];
  href: string;
  permission?: Permission;
  /** Words to look for on screen so Simba can say where the button is. */
  where?: string;
}

export const JOURNEY: JourneyStep[] = [
  {
    id: "company",
    title: "Fill in the company profile",
    major: true,
    why: "Your logo, phone, WhatsApp and address appear on the website header, footer, notices and receipts.",
    how: ["Open Settings, then press Edit.", "Upload the logo and enter the company name, phone, WhatsApp, email and address.", "Press Save at the bottom."],
    href: "/admin/settings/edit",
    permission: "settings.manage",
    where: "Settings → Edit",
  },
  {
    id: "team",
    title: "Add your team and set their roles",
    major: false,
    why: "Everyone who works in the panel needs their own sign-in so each action is recorded against the right person.",
    how: ["Open Staff & Users and press New user.", "Choose a role: it decides what that person can see and change.", "Save, then give them the sign-in details."],
    href: "/admin/users/new",
    permission: "users.view",
    where: "Staff & Users → New",
  },
  {
    id: "project",
    title: "Create your first project",
    major: true,
    why: "A project is the base of everything: buildings, units, owners, money and construction all hang under it.",
    how: ["Open Projects and press New project.", "Enter the name, address, city, type and status.", "Save. You land inside the project workspace."],
    href: "/admin/projects/new",
    permission: "project.create",
    where: "Projects → New project",
  },
  {
    id: "structure",
    title: "Build the structure: buildings, floors, units",
    major: true,
    why: "Flats must exist before you can sell them, give them to owners, or take payments for them.",
    how: ["Open the project, then the Units tab.", "Add a building, then its floors (the bulk generator can add them all at once).", "Add the flats on each floor, then open each one and enter size, rooms and base price."],
    href: "/admin/projects",
    permission: "unit.manage",
    where: "Project → Units",
  },
  {
    id: "plans",
    title: "Upload the floor plans",
    major: true,
    why: "The client app shows each owner their own flat lit up on the building's floor plan.",
    how: ["Open the project, then Floor plans.", "Upload the typical floor drawing.", "Mark each flat's area on the drawing and save."],
    href: "/admin/client-page",
    permission: "project.update",
    where: "Project → Floor plans",
  },
  {
    id: "parking",
    title: "Add parking spots",
    major: false,
    why: "Parking can be given to flats and shows in the owner's app.",
    how: ["Open the project, then Parking.", "Add spots one by one, or generate many.", "Assign a spot to a flat when it is sold."],
    href: "/admin/parking",
    permission: "parking.manage",
    where: "Project → Parking",
  },
  {
    id: "clients",
    title: "Add your customers, shareholders and landowners",
    major: true,
    why: "These are the people who own flats, pay money and sign in to the client app.",
    how: ["Open Customers (or Shareholders, Landowners) and press Add.", "Enter name, phone and email.", "Save. Each person gets their own profile."],
    href: "/admin/customers/new",
    permission: "customer.create",
    where: "Customers → Add",
  },
  {
    id: "owners",
    title: "Give flats to their owners",
    major: true,
    why: "A flat only appears in someone's client app, and payments only match, once it has an owner.",
    how: ["Open the project, then Distribute.", "Drag each flat onto its owner (or open a unit and use Assign owner).", "Check the Owners tab to see the result."],
    href: "/admin/client-page",
    permission: "unit.manage",
    where: "Project → Distribute",
  },
  {
    id: "sales",
    title: "Record the sales",
    major: true,
    why: "A sale holds the agreed price and links the customer to the flat.",
    how: ["Open Bookings to hold a flat, or Sales → New sale.", "Choose the flat and the customer, enter the price.", "Save."],
    href: "/admin/sales/new",
    permission: "sales.create",
    where: "Sales → New sale",
  },
  {
    id: "installments",
    title: "Set up the payment plan (installments)",
    major: true,
    why: "Installments give each due payment a date, so the system can tell what is upcoming and what is overdue.",
    how: ["Open Installments and press New.", "Choose the sale, enter the amount and due date.", "Repeat for each due payment."],
    href: "/admin/sales/installments/new",
    permission: "sales.create",
    where: "Installments → New",
  },
  {
    id: "payments",
    title: "Record the payments received",
    major: true,
    why: "Recorded payments update what each client has paid and what is left, and appear in their app.",
    how: ["Open Record a payment.", "Choose the sale, amount, date and method.", "Save. You can then send a receipt from Send a notice / receipt."],
    href: "/admin/sales/payments/new",
    permission: "finance.manage",
    where: "Record a payment",
  },
  {
    id: "budget",
    title: "Set the project budget and cost split",
    major: false,
    why: "A budget compares planned against real spending; a cost split tells each owner their share of a shared cost.",
    how: ["Open Project Finance and add the budget lines.", "Open Budgets & cost splits → New budget split.", "Choose the method and check the preview before saving."],
    href: "/admin/finance/cost-allocations/new",
    permission: "finance.manage",
    where: "Budgets & cost splits",
  },
  {
    id: "construction",
    title: "Add the construction phases",
    major: false,
    why: "Phases drive the progress owners see in the app and on the public Construction page.",
    how: ["Open the project, then Construction.", "Add each phase with start and target dates.", "Update progress and add photos as work moves on."],
    href: "/admin/construction",
    permission: "construction.manage",
    where: "Project → Construction",
  },
  {
    id: "materials",
    title: "Track materials and vendors",
    major: false,
    why: "Vendors, purchases and stock keep real spending and what is in store accurate.",
    how: ["Open Vendors and add who you buy from.", "Add Materials, then record each Purchase.", "Use Stock to correct or move items."],
    href: "/admin/procurement",
    permission: "procurement.manage",
    where: "Vendors / Purchases / Stock",
  },
  {
    id: "documents",
    title: "Upload documents",
    major: false,
    why: "Owners can open and download the papers you add here.",
    how: ["Open Documents and press New.", "Choose who it belongs to (project, flat, customer…) and upload the file.", "Save."],
    href: "/admin/documents/new",
    permission: "documents.upload",
    where: "Documents → New",
  },
  {
    id: "website",
    title: "Fill the public website",
    major: true,
    why: "Your public site only shows what you add here: projects, properties, news, gallery, story and team.",
    how: ["Open Public page for a button for every part of the site.", "Add each project and its blueprint, then properties, news and gallery photos.", "Open the website in another tab and check it."],
    href: "/admin/public-page",
    permission: "content.view",
    where: "Public page",
  },
  {
    id: "clientApp",
    title: "Give clients access to the app",
    major: true,
    why: "Clients see their flat, plan, payments and construction in the app, but only after you give them a way in.",
    how: ["Open a customer's profile (Client page → One client).", "Turn on their personal link, or set a phone login.", "Press the WhatsApp button to send it."],
    href: "/admin/client-page",
    permission: "users.manage",
    where: "Client page → One client",
  },
];

export const MAJOR_WEIGHT = 2;
export const OPTIONAL_WEIGHT = 1;
